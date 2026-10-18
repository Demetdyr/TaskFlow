export function createReportController(reportService) {
  return {
    async getCompletedTasksReport(request, response) {
      response.json({ data: await reportService.getCompletedTasksReport() });
    },

    async getPendingTasksReport(request, response) {
      response.json({ data: await reportService.getPendingTasksReport() });
    },

    async getSummaryReport(request, response) {
      response.json({ data: await reportService.getSummaryReport() });
    },
  };
}
