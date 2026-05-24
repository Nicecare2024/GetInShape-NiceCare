(() => {
  const charts = [];
  let allMembers = [];
  let allPayments = [];

  function formatCurrency(value) {
    return `Rs ${Math.round(value || 0).toLocaleString("en-IN")}`;
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function showEmpty(canvasId, emptyId, isEmpty) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (canvas) canvas.style.display = isEmpty ? "none" : "block";
    if (empty) empty.style.display = isEmpty ? "block" : "none";
  }

  function createChart(canvasId, emptyId, chartConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const labels = chartConfig?.data?.labels || [];
    const isEmpty = !labels.length || chartConfig?.data?.datasets?.every((d) => !d.data.some(Boolean));
    showEmpty(canvasId, emptyId, isEmpty);
    if (isEmpty) return;
    const chart = new Chart(canvas, chartConfig);
    charts.push(chart);
  }

  function clearCharts() {
    charts.forEach((chart) => chart.destroy());
    charts.length = 0;
  }

  function renderTableRows(tbodyId, rows, columns, emptyColspan) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${emptyColspan}" class="table-empty">No data yet</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((row) => `<tr>${columns.map((column) => `<td>${column(row)}</td>`).join("")}</tr>`)
      .join("");
  }

  function mergeTrends(memberTrend, revenueTrend) {
    const memberMap = new Map(memberTrend.labels.map((label, idx) => [label, memberTrend.values[idx]]));
    const revenueMap = new Map(revenueTrend.labels.map((label, idx) => [label, revenueTrend.values[idx]]));
    const labels = [...new Set([...memberTrend.labels, ...revenueTrend.labels])];
    return {
      labels,
      memberValues: labels.map((label) => memberMap.get(label) || 0),
      revenueValues: labels.map((label) => revenueMap.get(label) || 0),
    };
  }

  function renderAnalytics(period) {
    const members = window.analyticsData.filterByPeriod(allMembers, "joiningDate", period);
    const payments = window.analyticsData.filterByPeriod(allPayments, "date", period);
    const kpis = window.analyticsData.computeKPIs(members, payments);
    const topPayers = window.analyticsData.topPayers(payments, 10);
    const unpaidMembers = window.analyticsData.membersWithoutPayments(members, payments);
    const paymentCountTrend = window.analyticsData.groupByMonth(payments, "date");
    const memberJoinTrend = window.analyticsData.groupByMonth(members, "joiningDate");
    const revenueTrend = window.analyticsData.groupRevenueByMonth(payments, "date");
    const paymentDistribution = window.analyticsData.paymentDistribution(payments);
    const trendComparison = mergeTrends(memberJoinTrend, revenueTrend);

    const payingMembersCount = topPayers.length;
    const avgRevenuePerPayer = payingMembersCount > 0 ? kpis.totalRevenue / payingMembersCount : 0;

    setText("kpiPayingMembers", payingMembersCount.toLocaleString("en-IN"));
    setText("kpiMembersWithoutPayment", unpaidMembers.length.toLocaleString("en-IN"));
    setText("kpiAvgRevenuePerPayer", formatCurrency(avgRevenuePerPayer));
    setText("kpiPaymentsInPeriod", payments.length.toLocaleString("en-IN"));

    clearCharts();

    createChart("monthlyPaymentCountChart", "monthlyPaymentCountEmpty", {
      type: "bar",
      data: {
        labels: paymentCountTrend.labels,
        datasets: [{ label: "Payments", data: paymentCountTrend.values, backgroundColor: "#0ea5e9" }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("topPayersChart", "topPayersEmpty", {
      type: "bar",
      data: {
        labels: topPayers.map((payer) => payer.name || payer.phone),
        datasets: [{ label: "Total Paid", data: topPayers.map((payer) => payer.totalAmount), backgroundColor: "#14b8a6" }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    createChart("membersPaymentStatusChart", "membersPaymentStatusEmpty", {
      type: "doughnut",
      data: {
        labels: ["With Payment", "Without Payment"],
        datasets: [
          {
            data: [payingMembersCount, unpaidMembers.length],
            backgroundColor: ["#0ea5e9", "#f59e0b"],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("paymentDistributionChart", "paymentDistributionEmpty", {
      type: "bar",
      data: {
        labels: paymentDistribution.labels,
        datasets: [{ label: "Payments", data: paymentDistribution.values, backgroundColor: "#6366f1" }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("joinVsRevenueChart", "joinVsRevenueEmpty", {
      type: "line",
      data: {
        labels: trendComparison.labels,
        datasets: [
          {
            label: "New Members",
            data: trendComparison.memberValues,
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.2)",
            yAxisID: "y",
            tension: 0.25,
          },
          {
            label: "Revenue",
            data: trendComparison.revenueValues,
            borderColor: "#14b8a6",
            backgroundColor: "rgba(20, 184, 166, 0.2)",
            yAxisID: "y1",
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { position: "left" },
          y1: { position: "right", grid: { drawOnChartArea: false } },
        },
      },
    });

    renderTableRows(
      "topPayersTableBody",
      topPayers,
      [
        (row) => row.name || "-",
        (row) => row.phone || "-",
        (row) => formatCurrency(row.totalAmount),
        (row) => row.paymentCount.toLocaleString("en-IN"),
      ],
      4
    );

    renderTableRows(
      "membersWithoutPaymentBody",
      unpaidMembers.slice(0, 20),
      [
        (row) => row.name || "-",
        (row) => row.phone || "-",
        (row) => row.memberId || "-",
      ],
      3
    );
  }

  async function init() {
    try {
      const payload = await window.analyticsData.fetchAllData();
      allMembers = payload.members;
      allPayments = payload.payments;
      const periodSelect = document.getElementById("periodSelect");
      renderAnalytics(periodSelect.value);

      periodSelect.addEventListener("change", () => renderAnalytics(periodSelect.value));
      document
        .getElementById("refreshAnalyticsBtn")
        .addEventListener("click", () => renderAnalytics(periodSelect.value));
    } catch (error) {
      console.error("Analytics initialization failed:", error);
    }
  }

  window.addEventListener("load", init);
})();
