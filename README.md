# SchoolHub — School Management App

A cross-platform (Android / iOS / Web) school management app built with **React Native + Expo + TypeScript**.
One app, three roles: **Admin**, **Teacher** and **Parent**.

## Features

| Admin | Teacher | Parent |
|---|---|---|
| Dashboard: students, teachers, attendance, fee and salary summaries | Home: today's classes, alerts, quick actions | Home: absence / fee / message alerts, today's timetable |
| Students: add, delete, search, filter, open full profile | Mark attendance (Present / Absent / Leave), parents alerted | Child profile with photo, details, attendance, results, fees |
| Teachers: add with subject, classes and **salary**; edit salary | Post homework (parents notified) | Attendance % and day-by-day history |
| **Teacher salaries**: monthly list, paid / unpaid, pay, generate next month | Enter exam marks, auto grades, class average | Exam results + **PDF report card** download |
| Fee vouchers per month, mark paid, generate next month | **My Salary**: monthly salary and payment history | Fee history and (demo) online payment |
| **Timetable editor**: subject + teacher per period, per class | **My Timetable**: weekly schedule with "Now" marker | Weekly **timetable** |
| Notices to everyone / parents / teachers | **Chat** with parents | **Chat** with the child's teachers |

**Everyone:** in-app notification centre (bell icon), phone alerts, **dark mode**, **English / اردو**, settings & logout.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
| Parent | parent@school.com | parent123 |

The login screen has one-tap demo buttons. Admin → Settings → **Reset demo data** restores the sample data.

## Run it

```bash
npm install
npx expo start
```

- **Phone:** install **Expo Go** and scan the QR code.
- **Browser:** press `w`.

Notes: phone alerts work in the mobile app (not the browser). Switching to Urdu flips the layout right-to-left after the app is restarted on a phone.

## Project structure

```
src/
  app/                      Screens (Expo Router)
    login.tsx  settings.tsx  notifications.tsx
    chat/[id].tsx           Chat thread
    student/[id].tsx        Student profile
    admin/(tabs)/           Dashboard, Students, Teachers, Fees, Salaries
    admin/                  Timetable editor, Notices
    teacher/(tabs)/         Home, Attendance, Homework, Results, Messages
    teacher/                My Timetable, My Salary, Notices
    parent/(tabs)/          Home, Attendance, Results, Fees, Messages
    parent/                 Homework, Timetable
  components/               UI kit, theme (light/dark), timetable, chat list
  data/                     types, demo data, store (all reads/writes)
  lib/                      i18n + Urdu dictionary, PDF report card, phone alerts, helpers
```

## Backend: Firebase

With a `.env` file (see `.env.example`) the app uses **Firebase Authentication** for logins and
**Cloud Firestore** for data, synced live to every signed-in device. Without it, the app runs in
offline demo mode (data saved on the device only).

- `src/lib/firebase.ts`: Firebase setup.
- `src/data/cloud.ts`: Firestore sync. Each role only downloads what it may see.
- `firestore.rules`: security rules (admin: everything; teacher: own classes and own salary;
  parent: own children and fees; chat and notifications: only their owners).
- A new, empty project shows **"Set up demo school"** on the login screen. It creates the demo data and logins.

### Security rules
Rules are tested locally with the Firestore emulator (needs Java):

```bash
npm run test:rules
```

To publish changes, paste `firestore.rules` into Firebase console → Firestore → Rules → Publish,
or run `npx firebase deploy --only firestore:rules` after `npx firebase login`.

The admin login is set in two places: `ADMIN_EMAILS` in `src/data/cloud.ts` and `isAdmin()` in `firestore.rules`.
