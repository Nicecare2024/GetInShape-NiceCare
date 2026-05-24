(() => {
  const charts = [];

  function formatCurrency(value) {
    return `Rs ${Math.round(value || 0).toLocaleString("en-IN")}`;
  }

  function formatDate(value) {
    const date = window.analyticsData.parseDate(value);
    if (!date) return "-";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function setKPIs(kpis) {
    setText("kpiTotalMembers", kpis.totalMembers.toLocaleString("en-IN"));
    setText("kpiTotalRevenue", formatCurrency(kpis.totalRevenue));
    setText("kpiPaymentsRecorded", kpis.paymentsRecorded.toLocaleString("en-IN"));
    setText("kpiNewMembersThisMonth", kpis.newMembersThisMonth.toLocaleString("en-IN"));
    setText("kpiRevenueThisMonth", formatCurrency(kpis.revenueThisMonth));
    setText("kpiAveragePayment", formatCurrency(kpis.averagePaymentAmount));
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

  function showEmpty(canvasId, emptyId, isEmpty) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (canvas) canvas.style.display = isEmpty ? "none" : "block";
    if (empty) empty.style.display = isEmpty ? "block" : "none";
  }

  function createChart(config) {
    const chart = new Chart(config.canvas, config.options);
    charts.push(chart);
  }

  function clearCharts() {
    charts.forEach((chart) => chart.destroy());
    charts.length = 0;
  }

  function renderCharts(members, payments) {
    clearCharts();

    const revenueTrend = window.analyticsData.groupRevenueByMonth(payments, "date");
    const memberGrowth = window.analyticsData.groupByMonth(members, "joiningDate");
    const billingMonth = window.analyticsData.revenueByBillingMonth(payments);
    const bloodGroup = window.analyticsData.bloodGroupMix(members);

    showEmpty("revenueTrendChart", "revenueTrendEmpty", revenueTrend.labels.length === 0);
    showEmpty("memberGrowthChart", "memberGrowthEmpty", memberGrowth.labels.length === 0);
    showEmpty("billingMonthChart", "billingMonthEmpty", billingMonth.labels.length === 0);
    showEmpty("bloodGroupChart", "bloodGroupEmpty", bloodGroup.labels.length === 0);

    if (revenueTrend.labels.length > 0) {
      createChart({
        canvas: document.getElementById("revenueTrendChart"),
        options: {
          type: "line",
          data: {
            labels: revenueTrend.labels,
            datasets: [
              {
                label: "Revenue",
                data: revenueTrend.values,
                borderColor: "#0ea5e9",
                backgroundColor: "rgba(14, 165, 233, 0.2)",
                tension: 0.25,
                fill: true,
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        },
      });
    }

    if (memberGrowth.labels.length > 0) {
      createChart({
        canvas: document.getElementById("memberGrowthChart"),
        options: {
          type: "bar",
          data: {
            labels: memberGrowth.labels,
            datasets: [{ label: "New Members", data: memberGrowth.values, backgroundColor: "#14b8a6" }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        },
      });
    }

    if (billingMonth.labels.length > 0) {
      createChart({
        canvas: document.getElementById("billingMonthChart"),
        options: {
          type: "bar",
          data: {
            labels: billingMonth.labels,
            datasets: [{ label: "Billing Revenue", data: billingMonth.values, backgroundColor: "#6366f1" }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        },
      });
    }

    if (bloodGroup.labels.length > 0) {
      createChart({
        canvas: document.getElementById("bloodGroupChart"),
        options: {
          type: "doughnut",
          data: {
            labels: bloodGroup.labels,
            datasets: [
              {
                data: bloodGroup.values,
                backgroundColor: ["#0ea5e9", "#14b8a6", "#6366f1", "#f97316", "#22c55e", "#a855f7"],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        },
      });
    }
  }

  async function initDashboard() {
    try {
      const { members, payments } = await window.analyticsData.fetchAllData();
      const kpis = window.analyticsData.computeKPIs(members, payments);
      setKPIs(kpis);
      renderCharts(members, payments);

      const recentPayments = window.analyticsData.recentItems(payments, "date", 5);
      renderTableRows(
        "recentPaymentsBody",
        recentPayments,
        [
          (row) => row.name || "-",
          (row) => row.phone || "-",
          (row) => formatCurrency(window.analyticsData.safeNumber(row.amount)),
          (row) => formatDate(row.date),
        ],
        4
      );

      const recentMembers = window.analyticsData.recentItems(members, "joiningDate", 5);
      renderTableRows(
        "recentMembersBody",
        recentMembers,
        [
          (row) => row.name || "-",
          (row) => row.phone || "-",
          (row) => row.memberId || "-",
          (row) => formatDate(row.joiningDate),
        ],
        4
      );
    } catch (error) {
      console.error("Dashboard initialization failed:", error);
    }
  }

  window.addEventListener("load", initDashboard);
})();
