const express = require('express');
const app = express();
const port = 3000;

// @ts-ignore
app.get('/greet', (req, res) => {
    res.send('hello');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
