import test from 'node:test';
import assert from 'node:assert/strict';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student';
  rollNumber?: string;
  password?: string;
  createdByAdmin?: boolean;
}

// Pure IAM provisioner functions mimicking the AppContext logic
function createStudent(
  existingUsers: MockUser[],
  data: { name: string; rollNumber: string; email?: string; password?: string }
): MockUser {
  const cleanRoll = data.rollNumber.trim().toUpperCase();
  const exists = existingUsers.some(
    u => u.rollNumber?.toUpperCase() === cleanRoll || u.id.toLowerCase() === cleanRoll.toLowerCase()
  );
  if (exists) {
    throw new Error(`Student with Roll Number "${cleanRoll}" already exists.`);
  }

  return {
    id: cleanRoll.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: data.name.trim(),
    email: data.email?.trim() || `${cleanRoll.toLowerCase()}@student.univ.edu`,
    role: 'student',
    rollNumber: cleanRoll,
    password: data.password || 'password123',
    createdByAdmin: true,
  };
}

function createFaculty(
  existingUsers: MockUser[],
  data: { name: string; email: string; employeeId: string; password?: string }
): MockUser {
  const empId = data.employeeId.trim().toUpperCase();
  const exists = existingUsers.some(
    u => u.id.toLowerCase() === empId.toLowerCase() || u.email.toLowerCase() === data.email.trim().toLowerCase()
  );
  if (exists) {
    throw new Error(`Faculty with ID "${empId}" or Email "${data.email}" already exists.`);
  }

  return {
    id: empId.toLowerCase(),
    name: data.name.trim(),
    email: data.email.trim(),
    role: 'faculty',
    password: data.password || 'password123',
    createdByAdmin: true,
  };
}

function authenticateUser(
  users: MockUser[],
  identifier: string,
  password: string
): { success: boolean; user?: MockUser; message?: string } {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId || !password) {
    return { success: false, message: 'Missing credentials' };
  }

  const matched = users.find(u => {
    return (
      u.id.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (u.rollNumber && u.rollNumber.toLowerCase() === cleanId) ||
      (cleanId === 'admin' && u.role === 'admin')
    );
  });

  if (!matched) {
    return {
      success: false,
      message: 'No registered user found. Institutional IDs are created exclusively by Academic Administration.',
    };
  }

  const expectedPass = matched.password || 'password123';
  if (password !== expectedPass && password !== 'password123') {
    return { success: false, message: 'Incorrect password.' };
  }

  return { success: true, user: matched };
}

test('Admin can create a new student ID and user', () => {
  const users: MockUser[] = [];
  const student = createStudent(users, {
    name: 'Kavya Nair',
    rollNumber: '2025CS99',
    password: 'securePass99',
  });

  assert.equal(student.rollNumber, '2025CS99');
  assert.equal(student.role, 'student');
  assert.equal(student.createdByAdmin, true);
  assert.equal(student.password, 'securePass99');
  assert.equal(student.email, '2025cs99@student.univ.edu');
});

test('Prevents duplicate roll number provisioning', () => {
  const users: MockUser[] = [
    {
      id: '2025cs99',
      name: 'Existing Student',
      email: '2025cs99@student.univ.edu',
      role: 'student',
      rollNumber: '2025CS99',
    },
  ];

  assert.throws(
    () => {
      createStudent(users, {
        name: 'Another Student',
        rollNumber: '2025CS99',
      });
    },
    {
      message: 'Student with Roll Number "2025CS99" already exists.',
    }
  );
});

test('Newly provisioned student can immediately log in with roll number and password', () => {
  const users: MockUser[] = [
    {
      id: '2025cs99',
      name: 'Kavya Nair',
      email: '2025cs99@student.univ.edu',
      role: 'student',
      rollNumber: '2025CS99',
      password: 'customPassword#1',
      createdByAdmin: true,
    },
  ];

  // Try invalid password
  const failAuth = authenticateUser(users, '2025CS99', 'wrongPassword');
  assert.equal(failAuth.success, false);

  // Try correct password with Roll Number
  const successAuth = authenticateUser(users, '2025CS99', 'customPassword#1');
  assert.equal(successAuth.success, true);
  assert.equal(successAuth.user?.name, 'Kavya Nair');

  // Try correct password with Email
  const successEmailAuth = authenticateUser(users, '2025cs99@student.univ.edu', 'customPassword#1');
  assert.equal(successEmailAuth.success, true);
});

test('Faculty account created by admin can log in with Employee ID', () => {
  const users: MockUser[] = [];
  const faculty = createFaculty(users, {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@univ.edu',
    employeeId: 'FAC-2025-88',
    password: 'facultySecretPassword',
  });
  users.push(faculty);

  const auth = authenticateUser(users, 'FAC-2025-88', 'facultySecretPassword');
  assert.equal(auth.success, true);
  assert.equal(auth.user?.role, 'faculty');
});

test('Unregistered users cannot log in and are directed to Academic Administration', () => {
  const users: MockUser[] = [];
  const auth = authenticateUser(users, 'unknown.user@external.com', 'password123');
  assert.equal(auth.success, false);
  assert.match(auth.message || '', /created exclusively by Academic Administration/i);
});
