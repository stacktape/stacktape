/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DescribeExecutionCommand, ListExecutionsCommand, SFNClient } from '@aws-sdk/client-sfn';
import { ThemeProvider, createTheme, ServerStyleSheets } from '@material-ui/core';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import SSRApp from './SSRApp';

const renderFullPage = (html: string, css: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Trasncoder dashboard</title>
        <style id="jss-server-side">${css}</style>
      </head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `;
};

const sfnClient = new SFNClient({});
const s3Client = new S3Client({});

export default async (_event, _context) => {
  try {
    // we fetch information about transcoder batch-job state machines and artifacts in bucket
    // this information is then passed as props into react app which we render server side
    const data = { executions: await getExecutions(), artifacts: await getAvailableArtifacts() };
    const sheets = new ServerStyleSheets();
    // rendering react app into html string
    const html = ReactDOMServer.renderToString(
      sheets.collect(
        <ThemeProvider theme={createTheme()}>
          <SSRApp data={data} />
        </ThemeProvider>
      )
    );
    // rendering styles into css string
    const css = sheets.toString();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      // returning fully rendered HTML page in response body
      body: renderFullPage(html, css)
    };
  } catch (error) {
    console.error(`Error ${error.message}`);
    return `Error ${error}`;
  }
};

// lists batchjob state machine executions
// state-machines are controling batch-job container executions
const getExecutions = async () => {
  try {
    const result = await sfnClient.send(
      new ListExecutionsCommand({ stateMachineArn: process.env.JOB_STATE_MACHINE_ARN, maxResults: 1000 })
    );
    return await Promise.all(
      (result.executions || []).map(async ({ executionArn }) => {
        const executionDetail = await sfnClient.send(new DescribeExecutionCommand({ executionArn }));
        const processedFileName = JSON.parse(JSON.parse(executionDetail.input).triggerEvent).Records[0].s3.object.key;
        return {
          ...executionDetail,
          processedFileName
        };
      })
    );
  } catch (err) {
    console.error(`unable to get executions. err: ${err}`);
  }
};

// scans bucket for transcoded videos
// then we generate download links for videos
const getAvailableArtifacts = async () => {
  try {
    const result = await s3Client.send(
      new ListObjectsV2Command({ Bucket: process.env.BUCKET_NAME, Prefix: 'transcoded' })
    );
    const groupedFiles: { [name: string]: { quality: string; downloadUrl: string }[] } = {};
    (
      await Promise.all(
        (result.Contents || []).map(async ({ Key }) => ({
          Key,
          downloadUrl: await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key }))
        }))
      )
    ).forEach(({ Key, downloadUrl }) => {
      const [_transcoded, name, fileName] = Key.split('/');
      if (!groupedFiles[name]) {
        groupedFiles[name] = [];
      }
      groupedFiles[name].push({
        quality: fileName.split('_')[0],
        downloadUrl
      });
      return name;
    });
    return groupedFiles;
  } catch (err) {
    console.error(`unable to list transcoded videos. err: ${err}`);
  }
};
