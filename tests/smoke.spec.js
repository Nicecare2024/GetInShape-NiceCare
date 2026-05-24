import { test, expect } from "@playwright/test";

const pages = [
  {
    path: "/",
    title: "Dashboard Home",
    heading: "Members",
    role: "link",
  },
  {
    path: "/member.html",
    title: "Member Management",
    heading: "Add Member",
    role: "heading",
  },
  {
    path: "/dashboard.html",
    title: "Business Dashboard",
    heading: "Business dashboard",
    role: "heading",
  },
  {
    path: "/analytics.html",
    title: "Analytics",
    heading: "Advanced analytics",
    role: "heading",
  },
  {
    path: "/payment.html",
    title: "Payment Tracker",
    heading: "Add Payment",
    role: "heading",
  },
  {
    path: "/attandance.html",
    title: "Member Attendance",
    heading: "Member Attendance",
    role: "heading",
  },
];

for (const pageInfo of pages) {
  test(`${pageInfo.path} renders core content`, async ({ page }) => {
    const response = await page.goto(pageInfo.path);
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(pageInfo.title);

    const locator =
      pageInfo.role === "link"
        ? page.getByRole("link", { name: pageInfo.heading, exact: true })
        : page.getByRole(pageInfo.role, { name: pageInfo.heading });

    await expect(locator).toBeVisible();
  });
}

test("dashboard logo asset loads", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator('img[src="edata.png"]');
  await expect(logo).toBeVisible();
});

test("dashboard navigation links resolve", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Business Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
  await expect(page.getByRole("heading", { name: "Business dashboard" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(page).toHaveURL(/\/analytics(\.html)?$/);
  await expect(page.getByRole("heading", { name: "Advanced analytics" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Members", exact: true }).click();
  await expect(page).toHaveURL(/\/member(\.html)?$/);
  await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Payments", exact: true }).click();
  await expect(page).toHaveURL(/\/payment(\.html)?$/);
  await expect(page.getByRole("heading", { name: "Add Payment" })).toBeVisible();
});
