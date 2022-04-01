import type { NextPage, GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import styles from '../styles/Home.module.css';

export const getStaticProps: GetStaticProps = async (_context) => {
  return { props: {}, revalidate: false };
};

const Home: NextPage<{ time: number }> = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>My website title</title>
        <meta name="description" content="My website deployed by Stacktape" />
        <link rel="icon" href="/static/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to my website.</h1>
      </main>
      <footer className={styles.footer}>
        <a href="https://stacktape.com" target="_blank" rel="noopener noreferrer">
          Powered by
          <span className={styles.logo}>
            <Image src="/static/stacktape-logo.svg" alt="Stacktape Logo" width={32} height={32} />
          </span>{' '}
          Stacktape
        </a>
      </footer>
    </div>
  );
};

export default Home;
