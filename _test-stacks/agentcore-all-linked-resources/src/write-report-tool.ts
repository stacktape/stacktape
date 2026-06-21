export default async (event: { input?: { reportId?: string; rows?: unknown[] } }) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      tool: 'write-report-tool',
      reportId: event.input?.reportId ?? 'missing',
      rowCount: event.input?.rows?.length ?? 0
    })
  };
};
