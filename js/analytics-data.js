(() => {
  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const BILLING_MONTH_LOOKUP = {
    jan: "Jan",
    january: "Jan",
    feb: "Feb",
    february: "Feb",
    mar: "Mar",
    march: "Mar",
    apr: "Apr",
    april: "Apr",
    may: "May",
    jun: "Jun",
    june: "Jun",
    jul: "Jul",
    july: "Jul",
    aug: "Aug",
    august: "Aug",
    sep: "Sep",
    sept: "Sep",
    september: "Sep",
    oct: "Oct",
    october: "Oct",
    nov: "Nov",
    november: "Nov",
    dec: "Dec",
    december: "Dec",
  };

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthLabelFromKey(key) {
    const [year, month] = key.split("-");
    const idx = Number(month) - 1;
    return `${MONTH_NAMES[idx]} ${year}`;
  }

  function normalizeMonthLabel(month) {
    if (!month) return "Unknown";
    const normalized = String(month).trim().toLowerCase();
    return BILLING_MONTH_LOOKUP[normalized] || "Unknown";
  }

  function safeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isWithinMonths(date, months) {
    if (!date || !months || months === "all") return true;
    const now = new Date();
    const threshold = new Date(now.getFullYear(), now.getMonth() - (Number(months) - 1), 1);
    return date >= threshold;
  }

  async function fetchCollection(collectionName) {
    if (!window.db) throw new Error("window.db is not initialized.");
    const snapshot = await window.db.collection(collectionName).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async function fetchAllData() {
    const [members, payments] = await Promise.all([
      fetchCollection("members"),
      fetchCollection("payments"),
    ]);
    return { members, payments };
  }

  function filterByPeriod(records, dateField, months = "all") {
    if (months === "all") return [...records];
    return records.filter((record) => isWithinMonths(parseDate(record[dateField]), months));
  }

  function groupByMonth(records, dateField) {
    const map = new Map();
    records.forEach((record) => {
      const date = parseDate(record[dateField]);
      if (!date) return;
      const key = toMonthKey(date);
      map.set(key, (map.get(key) || 0) + 1);
    });

    const sortedKeys = [...map.keys()].sort();
    return {
      labels: sortedKeys.map(monthLabelFromKey),
      values: sortedKeys.map((key) => map.get(key)),
    };
  }

  function groupRevenueByMonth(payments, dateField = "date") {
    const map = new Map();
    payments.forEach((payment) => {
      const date = parseDate(payment[dateField]);
      if (!date) return;
      const key = toMonthKey(date);
      map.set(key, (map.get(key) || 0) + safeNumber(payment.amount));
    });
    const sortedKeys = [...map.keys()].sort();
    return {
      labels: sortedKeys.map(monthLabelFromKey),
      values: sortedKeys.map((key) => map.get(key)),
    };
  }

  function revenueByBillingMonth(payments) {
    const map = new Map();
    payments.forEach((payment) => {
      const month = normalizeMonthLabel(payment.month);
      map.set(month, (map.get(month) || 0) + safeNumber(payment.amount));
    });
    const labels = MONTH_NAMES.filter((label) => map.has(label));
    if (map.has("Unknown")) labels.push("Unknown");
    return {
      labels,
      values: labels.map((label) => map.get(label) || 0),
    };
  }

  function bloodGroupMix(members) {
    const map = new Map();
    members.forEach((member) => {
      const key = (member.bloodGroup || "Unknown").toString().trim() || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([label]) => label),
      values: sorted.map(([, value]) => value),
    };
  }

  function topPayers(payments, limit = 10) {
    const map = new Map();
    payments.forEach((payment) => {
      const key = (payment.phone || payment.name || "Unknown").toString();
      if (!map.has(key)) {
        map.set(key, {
          name: payment.name || "Unknown",
          phone: payment.phone || "N/A",
          totalAmount: 0,
          paymentCount: 0,
        });
      }
      const aggregate = map.get(key);
      aggregate.totalAmount += safeNumber(payment.amount);
      aggregate.paymentCount += 1;
    });

    return [...map.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  function membersWithoutPayments(members, payments) {
    const paymentPhones = new Set(
      payments.map((payment) => (payment.phone || "").toString().trim()).filter(Boolean)
    );
    return members.filter((member) => {
      const phone = (member.phone || "").toString().trim();
      return !phone || !paymentPhones.has(phone);
    });
  }

  function paymentDistribution(payments) {
    const buckets = [
      { label: "0-499", min: 0, max: 499 },
      { label: "500-999", min: 500, max: 999 },
      { label: "1000-1999", min: 1000, max: 1999 },
      { label: "2000+", min: 2000, max: Infinity },
    ];
    const counts = buckets.map(() => 0);

    payments.forEach((payment) => {
      const amount = safeNumber(payment.amount);
      const idx = buckets.findIndex((bucket) => amount >= bucket.min && amount <= bucket.max);
      if (idx >= 0) counts[idx] += 1;
    });

    return {
      labels: buckets.map((bucket) => bucket.label),
      values: counts,
    };
  }

  function computeKPIs(members, payments) {
    const now = new Date();
    const totalMembers = members.length;
    const totalRevenue = payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
    const paymentsRecorded = payments.length;

    const newMembersThisMonth = members.filter((member) => {
      const date = parseDate(member.joiningDate);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const revenueThisMonth = payments.reduce((sum, payment) => {
      const date = parseDate(payment.date);
      if (!date) return sum;
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        return sum + safeNumber(payment.amount);
      }
      return sum;
    }, 0);

    const averagePaymentAmount = paymentsRecorded > 0 ? totalRevenue / paymentsRecorded : 0;
    const payingPhones = new Set(
      payments.map((payment) => (payment.phone || "").toString().trim()).filter(Boolean)
    );

    return {
      totalMembers,
      totalRevenue,
      paymentsRecorded,
      newMembersThisMonth,
      revenueThisMonth,
      averagePaymentAmount,
      payingMembers: payingPhones.size,
      membersWithoutPaymentCount: Math.max(totalMembers - payingPhones.size, 0),
    };
  }

  function recentItems(records, dateField, limit = 5) {
    return [...records]
      .map((item) => ({ item, date: parseDate(item[dateField]) }))
      .filter((entry) => entry.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  window.analyticsData = {
    parseDate,
    safeNumber,
    normalizeMonthLabel,
    fetchCollection,
    fetchAllData,
    filterByPeriod,
    groupByMonth,
    groupRevenueByMonth,
    revenueByBillingMonth,
    bloodGroupMix,
    topPayers,
    membersWithoutPayments,
    paymentDistribution,
    computeKPIs,
    recentItems,
  };
})();
