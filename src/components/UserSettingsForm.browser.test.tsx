import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { buildUser } from "../../test/factories";
import UserSettingsForm from "./UserSettingsForm";

test("saves edited profile details", async () => {
  const updateUser = vi.fn();
  const user = buildUser({ phoneNumber: "5551234567" });
  const screen = await render(<UserSettingsForm userProfile={user} updateUser={updateUser} />);
  for (const [placeholder, value] of [
    ["First Name", "Grace"],
    ["Last Name", "Hopper"],
    ["Email", "grace@example.com"],
    ["Phone Number", "5559876543"],
  ]) {
    await screen.getByPlaceholder(placeholder).fill(value);
  }
  await screen.getByRole("button", { name: "Save" }).click();
  expect(updateUser).toHaveBeenCalledWith({
    id: user.id,
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.com",
    phoneNumber: "5559876543",
    defaultPrivacyLevel: user.defaultPrivacyLevel,
  });
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("explains invalid and missing profile details before saving", async () => {
  const screen = await render(<UserSettingsForm userProfile={buildUser()} updateUser={vi.fn()} />);
  for (const placeholder of ["First Name", "Last Name", "Email", "Phone Number"])
    await screen.getByPlaceholder(placeholder).clear();
  await screen.getByPlaceholder("First Name").click();
  for (const message of ["Enter a first name", "Enter a last name", "Enter an email address"])
    await expect.element(screen.getByText(message)).toBeVisible();
  await screen.getByPlaceholder("Email").fill("invalid");
  await screen.getByPlaceholder("Phone Number").fill("invalid");
  await expect.element(screen.getByText("Must contain a valid email address")).toBeVisible();
  await expect.element(screen.getByText("Phone number is not valid")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
