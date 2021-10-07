import { DescribeExecutionCommandOutput } from '@aws-sdk/client-sfn';
import { Button, Divider, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
// import ThemeProvider from '@material-ui/styles/ThemeProvider';
import React from 'react';
import BucketArtifactList from './components/BucketArtifactList';
import ExecutionsList from './components/ExecutionsList';

const SSRApp = ({
  data,
}: {
  data: {
    artifacts: { [name: string]: { quality: string; downloadUrl: string }[] };
    executions: (DescribeExecutionCommandOutput & { processedFileName: string })[];
  };
}) => {
  return (
    <div>
      <Typography variant="h2" gutterBottom>
        Transcoding by Stacktape
      </Typography>
      <Divider style={{ margin: '50px' }} />
      <Typography variant="h4" gutterBottom>
        Start transcoding:
      </Typography>
      <Alert severity="info">
        You can start video transcoding process by{' '}
        <a
          href={`https://s3.console.aws.amazon.com/s3/upload/${process.env.BUCKET_NAME}?prefix=raw-videos/`}
          target="_blank"
        >
          <Button>uploading video file through AWS console</Button>
        </a>{' '}
        After you upload the file, refresh this page to monitor the execution process.
      </Alert>
      <Divider style={{ margin: '50px' }} />
      <Typography variant="h4" gutterBottom>
        Transcoded files to download:
      </Typography>
      <BucketArtifactList artifacts={data.artifacts} />
      <Divider style={{ margin: '50px' }} />
      <Typography variant="h4" gutterBottom>
        Executions:
      </Typography>
      <ExecutionsList executions={data.executions} />
    </div>
  );
};

export default SSRApp;
