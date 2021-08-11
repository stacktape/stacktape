import React from 'react';
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

const BucketArtifactList = ({
  artifacts
}: {
  artifacts: { [name: string]: { quality: string; downloadUrl: string }[] };
}) => {
  const classes = useStyles();
  return !artifacts ? (
    <Alert severity="error">Could not fetch transcoded videos</Alert>
  ) : !Object.keys(artifacts).length ? (
    <Alert severity="info">There are no transcoded videos in bucket</Alert>
  ) : (
    <TableContainer component={Paper} className={classes.paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>File name</TableCell>
            <TableCell align="right">720p</TableCell>
            <TableCell align="right">480p</TableCell>
            <TableCell align="right">360p</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(artifacts).map((name) => (
            <TableRow key={name}>
              <TableCell component="th" scope="row" className={classes.nameCell}>
                <span>{name}</span>
              </TableCell>
              {artifacts[name]
                .sort(({ quality: quality1 }, { quality: quality2 }) => Number(quality2) - Number(quality1))
                .map(({ downloadUrl }) => (
                  <TableCell align="right">
                    {' '}
                    <a href={downloadUrl}>
                      <Button>link</Button>
                    </a>
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BucketArtifactList;
