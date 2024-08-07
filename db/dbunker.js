const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 7777;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'yourdb',
  password: 'default',
  port: 5432,
});

app.get('/api/dumpDatabase', async (req, res) => {
  try {
    const client = await pool.connect();

    // Get all tables, views, stored procedures, and functions in the public schema
    const objectsQuery = `
      SELECT table_name AS name, 'table' AS type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      UNION
      SELECT table_name AS name, 'view' AS type
      FROM information_schema.views
      WHERE table_schema = 'public'
      UNION
      SELECT routine_name AS name, 'procedure' AS type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'PROCEDURE'
      UNION
      SELECT routine_name AS name, 'function' AS type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
      ORDER BY name;
    `;
    const objectsResult = await client.query(objectsQuery);
    const objects = objectsResult.rows;

    // Create a directory to store the dumped data
    const dumpDir = path.join(__dirname, 'db_dump');
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir);
    }

    // Dump data for each object
    for (const { name, type } of objects) {
      console.log(`Dumping ${type}: ${name}`);
      let dumpQuery;
      let columns = [];
      if (type === 'table') {
        // Get column names and data types for the table
        const columnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = '${name}';
        `;
        const columnsResult = await client.query(columnsQuery);
        columns = columnsResult.rows;

        dumpQuery = `SELECT * FROM ${name};`;
      } else if (type === 'view') {
        dumpQuery = `SELECT * FROM ${name};`;
      } else if (type === 'procedure' || type === 'function') {
        dumpQuery = `SELECT pg_get_functiondef(oid) AS definition FROM pg_proc WHERE proname = '${name}';`;
      }
      const dumpResult = await client.query(dumpQuery);
      const data = dumpResult.rows;

      // Write data to a JSON file, including column data types for tables
      const filePath = path.join(dumpDir, `${type}_${name}.json`);
      const dumpData = {
        columns: columns,
        data: data,
      };
      fs.writeFileSync(filePath, JSON.stringify(dumpData, null, 2));
    }

    await client.release();
    console.log('Database dump completed successfully.');
    res.send('Database dump completed successfully.');
  } catch (error) {
    console.error('Error dumping database:', error);
    res.status(500).send('Error dumping database');
  }
});

app.get('/api/loadDatabase', async (req, res) => {
  try {
    const client = await pool.connect();

    // Get all dumped JSON files
    const dumpDir = path.join(__dirname, 'db_dump');
    const files = fs.readdirSync(dumpDir);

    // Load data for each object
    for (const file of files) {
      const underscoreIndex = path.parse(file).name.indexOf('_');
      const type = path.parse(file).name.substring(0, underscoreIndex);
      const name = path.parse(file).name.substring(underscoreIndex + 1);
      console.log(`Loading ${type}: ${name}`);

      // Read data from the JSON file
      const filePath = path.join(dumpDir, file);
      const dumpData = JSON.parse(fs.readFileSync(filePath));
      const { columns, data } = dumpData;

      if (type === 'table') {
        // Drop the table if it exists
        const dropTableQuery = `DROP TABLE IF EXISTS "${name}";`;
        await client.query(dropTableQuery);

        // Create the table with correct column data types
        const columnDefinitions = columns.map(column => `${column.column_name} ${column.data_type}`).join(', ');
        const createTableQuery = `CREATE TABLE "${name}" (${columnDefinitions});`;
        await client.query(createTableQuery);

        // Insert data into the table using batch inserts
        if (data.length > 0) {
          const columnNames = columns.map(column => column.column_name).join(', ');
          const placeholders = data.map((row, index) => `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`).join(', ');
          const insertQuery = `
            INSERT INTO "${name}" (${columnNames})
            VALUES ${placeholders};
          `;
          const values = data.flatMap(row => columns.map(column => row[column.column_name]));
          await client.query(insertQuery, values);
        }
      } else if (type === 'view') {
        // Drop the view if it exists
        const dropViewQuery = `DROP VIEW IF EXISTS ${name};`;
        await client.query(dropViewQuery);

        // Create the view
        const createViewQuery = data[0].definition;
        await client.query(createViewQuery);
      } else if (type === 'procedure' || type === 'function') {
        // Drop the procedure/function if it exists
        const dropQuery = `DROP ${type} IF EXISTS ${name};`;
        await client.query(dropQuery);

        // Create the procedure/function
        const createQuery = data[0].definition;
        await client.query(createQuery);
      }
    }

    await client.release();
    console.log('Database load completed successfully.');
    res.send('Database load completed successfully.');
  } catch (error) {
    console.error('Error loading database:', error);
    res.status(500).send('Error loading database');
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
