export async function getServerSideProps() {
  return { props: { database: process.env.STP_DB_CONNECTION_STRING } };
}
export default function Page({ database }) {
  return <main>first-render: {database}</main>;
}
