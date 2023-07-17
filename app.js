const express = require("express");
const api = require('./src/routes/api');

const app = express();

// Error handling middleware
app.use((err, req, res, next) => {
  // Custom error handling logic, e.g., sending an error response to the user
  res.status(500).json({ error: err.message });
});

app.use("/api", api);

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
