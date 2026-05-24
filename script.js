const db = window.db;

let allMembers = [];
let currentPage = 1;
const pageSize = 9;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatJoinDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function updateMemberCount() {
  const countEl = document.getElementById("memberCount");
  const total = allMembers.length;
  countEl.textContent = total === 1 ? "1 member on file" : `${total} members on file`;
}

function updatePageIndicator(startIndex, visibleCount) {
  const indicator = document.getElementById("pageIndicator");
  if (!indicator) return;

  if (allMembers.length === 0) {
    indicator.textContent = "";
    return;
  }

  const from = startIndex + 1;
  const to = startIndex + visibleCount;
  indicator.textContent = `Showing ${from}–${to} of ${allMembers.length}`;
}

document.getElementById("memberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const member = {
    name: document.getElementById("name").value,
    joiningDate: document.getElementById("joiningDate").value,
    phone: document.getElementById("phone").value,
    bloodGroup: document.getElementById("bloodGroup").value,
    memberId: document.getElementById("memberId").value,
    memberAdd: document.getElementById("memberAdd") ? document.getElementById("memberAdd").value : ""
  };
  await db.collection("members").add(member);
  e.target.reset();
  loadMembers();
});

async function loadMembers() {
  const snapshot = await db.collection("members").get();
  allMembers = snapshot.docs
    .map(doc => ({ doc, data: doc.data() }))
    .sort((a, b) => a.data.memberId.localeCompare(b.data.memberId));

  currentPage = 1;
  updateMemberCount();
  renderPaginatedMembers();
}

function renderPaginatedMembers() {
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = allMembers.slice(startIndex, startIndex + pageSize);

  renderMemberCards(pageItems, startIndex);
  updatePageIndicator(startIndex, pageItems.length);

  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = startIndex + pageSize >= allMembers.length;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderPaginatedMembers();
  }
}

function nextPage() {
  if ((currentPage - 1) * pageSize + pageSize < allMembers.length) {
    currentPage++;
    renderPaginatedMembers();
  }
}

function renderMemberViewField(label, value) {
  return `
    <div class="member-view-field">
      <span class="member-view-field__label">${label}</span>
      <span class="member-view-field__value">${escapeHtml(value || "—")}</span>
    </div>
  `;
}

function renderMemberEditField(label, value, docId, field, type = "text", placeholder = "") {
  return `
    <div class="member-field">
      <label class="member-field__label">${label}</label>
      <input
        class="member-field__input"
        type="${type}"
        value="${escapeHtml(value)}"
        data-id="${docId}"
        data-field="${field}"
        data-original-value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
      >
    </div>
  `;
}

function renderMemberCards(memberEntries, startIndex = 0) {
  const container = document.getElementById("memberCards");
  container.innerHTML = "";

  if (memberEntries.length === 0) {
    container.innerHTML = `
      <div class="member-empty">
        <div class="member-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 class="member-empty__title">No members found</h3>
        <p class="member-empty__text">Add a member using the form above, or clear your search to view all records.</p>
      </div>
    `;
    updatePageIndicator(0, 0);
    return;
  }

  memberEntries.forEach((entry, index) => {
    const { doc, data } = entry;
    const serial = startIndex + index + 1;
    const initials = getInitials(data.name);
    const memberId = data.memberId || "—";
    const joinLabel = formatJoinDate(data.joiningDate);

    const card = document.createElement("article");
    card.className = "member-card-pro";
    card.setAttribute("data-member-id", doc.id);
    card.innerHTML = `
      <header class="member-card-pro__header">
        <div class="member-card-pro__profile">
          <div class="member-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
          <div class="member-card-pro__meta">
            <h3 class="member-card-pro__name">${escapeHtml(data.name || "Unnamed member")}</h3>
            <div class="member-card-pro__badges">
              <span class="member-card-pro__serial">#${serial}</span>
              <span class="member-card-pro__id">${escapeHtml(memberId)}</span>
            </div>
          </div>
        </div>
        <div class="member-card-pro__joined">
          <span class="member-card-pro__joined-label">Joined</span>
          <span class="member-card-pro__joined-date">${escapeHtml(joinLabel)}</span>
        </div>
      </header>

      <div class="member-card-view">
        <div class="member-view-grid">
          ${renderMemberViewField("Full Name", data.name)}
          ${renderMemberViewField("Phone", data.phone)}
          ${renderMemberViewField("Blood Group", data.bloodGroup)}
          ${renderMemberViewField("Member ID", data.memberId)}
          ${renderMemberViewField("Joining Date", data.joiningDate)}
          ${renderMemberViewField("Address", data.memberAdd || "—")}
        </div>
      </div>

      <div class="member-card-edit">
        <div class="member-card-pro__body">
          ${renderMemberEditField("Full Name", data.name, doc.id, "name", "text", "Member name")}
          ${renderMemberEditField("Phone", data.phone, doc.id, "phone", "tel", "Phone number")}
          ${renderMemberEditField("Blood Group", data.bloodGroup, doc.id, "bloodGroup", "text", "Blood group")}
          ${renderMemberEditField("Member ID", data.memberId, doc.id, "memberId", "text", "Member ID")}
          ${renderMemberEditField("Joining Date", data.joiningDate, doc.id, "joiningDate", "date")}
          ${renderMemberEditField("Address", data.memberAdd || "", doc.id, "memberAdd", "text", "Optional address")}
        </div>
      </div>

      <footer class="member-card-pro__footer">
        <div class="member-card-actions member-card-actions-view">
          <button type="button" class="btn-member-action btn-member-view" onclick="openMemberDetails('${doc.id}')" title="View more" aria-label="View more">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button type="button" class="btn-member-action btn-member-edit" onclick="openMemberEdit('${doc.id}')" title="Edit member" aria-label="Edit member">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button type="button" class="btn-member-action btn-member-delete" onclick="deleteMember('${doc.id}')" title="Remove member" aria-label="Remove member">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <div class="member-card-actions member-card-actions-edit">
          <button type="button" class="btn-member-action btn-member-save-icon" onclick="saveMemberEdits('${doc.id}')" title="Save changes" aria-label="Save changes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
          </button>
          <button type="button" class="btn-member-action btn-member-cancel" onclick="cancelMemberEdit('${doc.id}')" title="Cancel edit" aria-label="Cancel edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </footer>
    `;
    container.appendChild(card);
  });
}

function openMemberEdit(id) {
  const card = document.querySelector(`[data-member-id="${id}"]`);
  if (!card) return;
  card.classList.add("is-editing");
}

function openMemberDetails(id) {
  window.location.href = `member-details.html?id=${encodeURIComponent(id)}`;
}

function cancelMemberEdit(id) {
  const card = document.querySelector(`[data-member-id="${id}"]`);
  if (!card) return;
  const inputs = card.querySelectorAll(`[data-id="${id}"]`);
  inputs.forEach((input) => {
    input.value = input.dataset.originalValue || "";
  });
  card.classList.remove("is-editing");
}

async function saveMemberEdits(id) {
  const card = document.querySelector(`[data-member-id="${id}"]`);
  if (!card) return;
  const inputs = card.querySelectorAll(`[data-id="${id}"]`);
  const updatedData = {};
  inputs.forEach((input) => {
    updatedData[input.dataset.field] = input.value;
  });

  try {
    await updateMember(id, updatedData);
    const memberIndex = allMembers.findIndex((entry) => entry.doc.id === id);
    if (memberIndex >= 0) {
      allMembers[memberIndex].data = {
        ...allMembers[memberIndex].data,
        ...updatedData,
      };
    }
    renderPaginatedMembers();
  } catch (error) {
    console.error("Failed to update member:", error);
  }
}

async function updateMember(id, updatedDataOverride) {
  let updatedData = updatedDataOverride;
  if (!updatedData) {
    const inputs = document.querySelectorAll(`[data-id="${id}"]`);
    updatedData = {};
    inputs.forEach((input) => {
      updatedData[input.dataset.field] = input.value;
    });
  }
  await db.collection("members").doc(id).update(updatedData);
  return true;
}

async function deleteMember(id) {
  if (confirm("Are you sure you want to delete this member?")) {
    await db.collection("members").doc(id).delete();
    loadMembers();
  }
}

function searchMember() {
  const keyword = document.getElementById("searchName").value.trim().toLowerCase();
  if (!keyword) return;

  const filtered = allMembers.filter(entry =>
    entry.data.name.toLowerCase().includes(keyword)
  );

  renderMemberCards(filtered, 0);
  updatePageIndicator(0, filtered.length);
  document.getElementById("prevBtn").disabled = true;
  document.getElementById("nextBtn").disabled = true;

  const countEl = document.getElementById("memberCount");
  countEl.textContent = filtered.length === 1
    ? "1 matching member"
    : `${filtered.length} matching members`;
}

window.onload = loadMembers;

document.getElementById("searchName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchMember();
  }
});
