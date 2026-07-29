import React from 'react';
import { LegalPage, LegalSection } from '../components/legal-page';

const SECTIONS: LegalSection[] = [
  {
    title: 'What we collect',
    body: 'Account details (name, email, password hash), booking details (services, times, chosen professional, notes you add), messages you exchange with Providers, reviews, favorites, language preference, and payment metadata such as amounts, invoice numbers and transaction status. Card numbers are handled entirely by our payment partner and never touch Bink’s servers.',
  },
  {
    title: 'How we use it',
    body: 'To operate the marketplace: showing your appointments, delivering messages, issuing tax invoices, releasing escrow payments, sending booking notifications, and keeping the platform safe. We also use aggregate, de-identified data to understand how Bink is used and to improve it.',
  },
  {
    title: 'What Providers see',
    body: 'When you book, the Provider sees your name, the booking details, any notes you add, and your messages to them. Team members at a Provider see only the bookings and conversations assigned to them. Providers never see your payment credentials.',
  },
  {
    title: 'Sharing',
    body: 'We share data only with the service providers needed to run Bink - payment processing, cloud hosting and email delivery - under contracts that limit their use of it. We do not sell your personal data. We may disclose data where the law requires it.',
  },
  {
    title: 'Where your data lives',
    body: 'Bink runs on cloud infrastructure with the database hosted in the European Union, protected by row-level security so each account can only read the data it is entitled to. Access by the Bink team is limited to what operating and supporting the platform requires.',
  },
  {
    title: 'Retention',
    body: 'We keep your data while your account is active. Booking and invoice records are retained as required by Saudi tax regulations even after account deletion; other personal data is deleted or anonymised when your account is closed.',
  },
  {
    title: 'Your rights',
    body: 'You can view and edit your profile in the app, and change your language at any time. To request a copy of your data or the deletion of your account, contact support@bink.app and we will respond within 30 days, subject to records we must keep by law.',
  },
  {
    title: 'Local storage',
    body: 'Bink stores a small amount of data on your device - your session, language choice and interface preferences - so the app works and remembers you. We do not use third-party advertising trackers.',
  },
  {
    title: 'Children',
    body: 'Bink is not directed at children under 16, and we do not knowingly collect their data. If you believe a child has created an account, contact us and we will remove it.',
  },
  {
    title: 'Changes to this policy',
    body: 'If we materially change how we handle personal data, we will announce it in the app before the change takes effect. The date at the top of this page always reflects the latest version.',
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 14, 2026"
      intro="This policy explains what personal data Bink collects, why, and the choices you have. It applies to the Bink website and app, for customers, salon owners, freelancers and their team members alike. This document is a working draft prepared for review by legal counsel before public launch."
      sections={SECTIONS}
    />
  );
}
