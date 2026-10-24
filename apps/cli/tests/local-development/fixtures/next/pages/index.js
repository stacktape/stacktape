export async function getServerSideProps() {
  return {
    props: {
      database: process.env.STP_DB_CONNECTION_STRING,
      cache: process.env.STP_CACHE_CONNECTION_STRING ?? 'not-connected'
    }
  };
}
export default function Page({ database, cache }) {
  return (
    <main>
      first-render: {database} cache: {cache}
    </main>
  );
}
