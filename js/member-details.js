(() => {
  const db = window.db;
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id");

  const memberInfoEl = document.getElementById("memberInfo");
  const billForm = document.getElementById("billForm");
  const billTableBody = document.getElementById("billTableBody");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function billsCollectionRef() {
    return db.collection("members").doc(memberId).collection("bills");
  }

  function renderBills(snapshot) {
    if (snapshot.empty) {
      billTableBody.innerHTML = '<tr><td colspan="4" class="table-empty">No bill records found.</td></tr>';
      return;
    }

    const rows = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.year || "").localeCompare(a.year || ""))
      .map((bill) => `
        <tr>
          <td>${escapeHtml(bill.year || "-")}</td>
          <td>${escapeHtml(bill.month || "-")}</td>
          <td>${escapeHtml(bill.billNo || "-")}</td>
          <td>
            <button type="button" class="btn-member-action btn-member-delete" onclick="window.deleteBill('${bill.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `)
      .join("");

    billTableBody.innerHTML = rows;
  }

  async function loadMember() {
    if (!memberId) {
      memberInfoEl.textContent = "Invalid member ID.";
      billForm.querySelector("button[type='submit']").disabled = true;
      return;
    }

    const memberDoc = await db.collection("members").doc(memberId).get();
    if (!memberDoc.exists) {
      memberInfoEl.textContent = "Member not found.";
      billForm.querySelector("button[type='submit']").disabled = true;
      return;
    }

    const member = memberDoc.data();
    memberInfoEl.textContent = `${member.name || "Member"} • ${member.phone || "No phone"} • ${member.memberId || "No member ID"}`;
  }

  async function loadBills() {
    if (!memberId) return;
    const snapshot = await billsCollectionRef().get();
    renderBills(snapshot);
  }

  async function addBill(event) {
    event.preventDefault();
    if (!memberId) return;

    const payload = {
      year: document.getElementById("billYear").value,
      month: document.getElementById("billMonth").value.trim(),
      billNo: document.getElementById("billNo").value.trim(),
      createdAt: new Date().toISOString(),
    };

    await billsCollectionRef().add(payload);
    billForm.reset();
    loadBills();
  }

  window.deleteBill = async (billId) => {
    if (!confirm("Delete this bill?")) return;
    await billsCollectionRef().doc(billId).delete();
    loadBills();
  };

  billForm.addEventListener("submit", addBill);

  window.addEventListener("load", async () => {
    try {
      await loadMember();
      await loadBills();
    } catch (error) {
      console.error("Error loading member details:", error);
      memberInfoEl.textContent = "Error loading member details.";
    }
  });
})();
