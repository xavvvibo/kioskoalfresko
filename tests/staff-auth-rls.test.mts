import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAccessEmployeeRecord,
  canReadSensitiveStaffData,
  detectDuplicateStaffIdentityLinks,
  sanitizeStaffAccessAuditMetadata,
  validateStaffEmployeeLink,
} from "../lib/admin-kiosko/staff/identity-rules.ts";
import { hashStaffPin, verifyStaffPin } from "../lib/admin-kiosko/staff/pin.ts";

const employee = {
  id: "emp_1",
  auth_user_id: "user_1",
  organization_id: "org_1",
  primary_location_id: "loc_1",
  status: "active",
};

test("owner puede acceder a empleados de cualquier centro", () => {
  assert.equal(canAccessEmployeeRecord({
    adminUserId: "owner",
    employeeId: null,
    organizationIds: [],
    locationIds: [],
    permissions: [],
    isOwner: true,
    isManager: true,
  }, employee), true);
});

test("empleado solo accede a su propio expediente", () => {
  assert.equal(canAccessEmployeeRecord({
    adminUserId: "user_1",
    employeeId: "emp_1",
    organizationIds: ["org_1"],
    locationIds: ["loc_1"],
    permissions: [],
    isOwner: false,
    isManager: false,
  }, employee), true);

  assert.equal(canAccessEmployeeRecord({
    adminUserId: "user_2",
    employeeId: "emp_2",
    organizationIds: ["org_1"],
    locationIds: ["loc_1"],
    permissions: [],
    isOwner: false,
    isManager: false,
  }, employee), false);
});

test("manager no accede fuera de su centro u organización", () => {
  const manager = {
    adminUserId: "manager",
    employeeId: "manager_emp",
    organizationIds: ["org_1"],
    locationIds: ["loc_1"],
    permissions: ["staff:read"],
    isOwner: false,
    isManager: true,
  };

  assert.equal(canAccessEmployeeRecord(manager, employee), true);
  assert.equal(canAccessEmployeeRecord(manager, { ...employee, primary_location_id: "loc_2" }), false);
  assert.equal(canAccessEmployeeRecord(manager, { ...employee, organization_id: "org_2" }), false);
});

test("permiso sensible no se deriva de staff:read", () => {
  assert.equal(canReadSensitiveStaffData({
    adminUserId: "manager",
    employeeId: "manager_emp",
    organizationIds: ["org_1"],
    locationIds: ["loc_1"],
    permissions: ["staff:read"],
    isOwner: false,
    isManager: true,
  }, employee), false);

  assert.equal(canReadSensitiveStaffData({
    adminUserId: "hr",
    employeeId: "hr_emp",
    organizationIds: ["org_1"],
    locationIds: ["loc_1"],
    permissions: ["staff:sensitive:read"],
    isOwner: false,
    isManager: true,
  }, employee), true);
});

test("detecta vínculos duplicados e inconsistentes", () => {
  assert.deepEqual(detectDuplicateStaffIdentityLinks([
    employee,
    { ...employee, id: "emp_2", auth_user_id: "user_1" },
    { ...employee, id: "emp_3", auth_user_id: null },
  ]), [{ adminUserId: "user_1", employeeIds: ["emp_1", "emp_2"] }]);

  assert.equal(validateStaffEmployeeLink({
    employee,
    adminUserExists: true,
    adminUserActive: true,
    linkedEmployeeIdsForUser: ["emp_1"],
  }), "valid");
  assert.equal(validateStaffEmployeeLink({
    employee,
    adminUserExists: false,
    adminUserActive: false,
    linkedEmployeeIdsForUser: ["emp_1"],
  }), "missing_admin_user");
  assert.equal(validateStaffEmployeeLink({
    employee,
    adminUserExists: true,
    adminUserActive: true,
    linkedEmployeeIdsForUser: ["emp_1", "emp_2"],
  }), "duplicate_link");
});

test("kiosk no acepta PIN incorrecto", () => {
  const hash = hashStaffPin("1357");
  assert.equal(verifyStaffPin("1357", hash), true);
  assert.equal(verifyStaffPin("9999", hash), false);
});

test("auditoría de acceso sanea secretos", () => {
  assert.deepEqual(sanitizeStaffAccessAuditMetadata({
    action: "download",
    cookie: "secret",
    token: "secret",
    serviceRole: "secret",
    pin: "1234",
    iban: "secret",
    documentContent: "secret",
    documentId: "doc_1",
  }), { action: "download", documentId: "doc_1" });
});
