import express from "express";
import { hello } from "@my-organization/utils/src/index";

const app = express();
const port = Number(process.env.PORT);

app.get("/", (req, res) => {
  res.json({
    message: hello(req?.query?.name as string),
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
