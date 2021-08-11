import React from 'react';
import { DescribeExecutionCommandOutput } from '@aws-sdk/client-sfn';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles({
  paper: {
    width: 1100
  },
  nameCell: {
    wordWrap: 'break-word',
    maxWidth: '500px',
    overflowY: 'hidden'
  }
});

const ExecutionsList = ({
  executions
}: {
  executions: (DescribeExecutionCommandOutput & { processedFileName: string })[];
}) => {
  const classes = useStyles();
  return !executions ? (
    <Alert severity="error">Could not fetch transcodig execution</Alert>
  ) : !executions.length ? (
    <Alert severity="info">There are no transcoding executions</Alert>
  ) : (
    <TableContainer component={Paper} className={classes.paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>File name</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Link</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {executions.map(({ processedFileName, status, executionArn }) => (
            <TableRow key={processedFileName}>
              <TableCell component="th" scope="row" className={classes.nameCell}>
                <span>{processedFileName}</span>
              </TableCell>
              <TableCell
                align="right"
                style={{
                  backgroundColor: status === 'SUCCEEDED' ? '#6ACE85' : status === 'RUNNING' ? '#5959bd' : '#ff4040'
                }}
              >
                {status}
              </TableCell>
              <TableCell align="right">
                <a href={`https://console.aws.amazon.com/states/home#/executions/details/${executionArn}`}>
                  <Button>see in AWS console</Button>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExecutionsList;
