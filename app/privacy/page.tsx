import type { Metadata } from 'next';
import { LegalPage, Section, CONTACT_EMAIL, APP_NAME } from '@/components/LegalPage';

export const metadata: Metadata = { title: `Privacy Policy · ${APP_NAME}` };

const li = 'list-disc pl-5 space-y-1.5';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {APP_NAME} (&ldquo;we&rdquo;, &ldquo;the app&rdquo;) helps you set goals, plan the work behind them and
        track your progress, with an AI coach. This policy explains what information the app uses, why,
        and the choices you have.
      </p>

      <Section heading="Information we collect">
        <ul className={li}>
          <li>
            <span className="text-fg">Account information.</span> When you sign up, our sign-in provider
            (Clerk) gives us your name, email address and profile picture, and a user ID that links your
            data to you.
          </li>
          <li>
            <span className="text-fg">Goals and progress.</span> The goals, stages, milestones and tasks you
            create, the tasks you tick off, your check-ins, and progress history.
          </li>
          <li>
            <span className="text-fg">Messages to the AI coach.</span> What you type to the coach, used to
            answer you and to build goal plans.
          </li>
          <li>
            <span className="text-fg">Google Calendar data (only if you connect it).</span> See the next
            section.
          </li>
          <li>
            <span className="text-fg">Preferences on your device.</span> Settings such as the coach&apos;s name,
            display options and your self-rated skill levels are kept in your browser&apos;s local storage.
          </li>
        </ul>
      </Section>

      <Section heading="Google Calendar">
        <p>
          Connecting Google Calendar is optional. If you connect it, the app requests read-only access to
          your calendar events (<code className="text-fg">calendar.events.readonly</code>) and uses it only to:
        </p>
        <ul className={li}>
          <li>read the start time, end time and title of <span className="text-fg">today&apos;s</span> events on your primary calendar;</li>
          <li>suggest times for your tasks in the free gaps between those events; and</li>
          <li>
            when you ask the AI coach for help planning, include today&apos;s events and free gaps in that request
            so the coach can suggest when to do your tasks.
          </li>
        </ul>
        <p>
          The app <span className="text-fg">cannot</span> create, change or delete calendar events. Calendar data
          is read in your browser and is not stored in our database. The Google access token is kept only in
          your browser tab&apos;s session storage, expires after about an hour, and is discarded when the tab is
          closed. You can disconnect at any time from the dashboard, and revoke access entirely at{' '}
          <a href="https://myaccount.google.com/permissions" className="text-brand underline">myaccount.google.com/permissions</a>.
        </p>
        <p>
          {APP_NAME}&apos;s use and transfer of information received from Google APIs adheres to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-brand underline">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements. Google user data is used only to provide the scheduling
          features described above. It is never sold, never used for advertising, and never used to train AI
          models, and no person reads it except where you ask us to for support, where required for security,
          or where required by law.
        </p>
      </Section>

      <Section heading="How we use information">
        <ul className={li}>
          <li>To run the app: save your goals, show your schedule, calculate progress, XP and goal health.</li>
          <li>To provide the AI coach and generate goal plans.</li>
          <li>To keep the service secure and fix problems.</li>
        </ul>
        <p>We do not sell your information and we do not use it for advertising.</p>
      </Section>

      <Section heading="Who we share it with">
        <p>Only the service providers needed to run the app, each processing data on our behalf:</p>
        <ul className={li}>
          <li><span className="text-fg">Clerk</span> — sign-in and account management.</li>
          <li><span className="text-fg">Neon</span> — the database that stores your goals and progress.</li>
          <li><span className="text-fg">Vercel</span> — hosting.</li>
          <li>
            <span className="text-fg">OpenAI</span> — powers the AI coach. Your messages and the goal context
            needed to answer them (and, if you have connected it, today&apos;s calendar events and free gaps) are
            sent to OpenAI&apos;s API to generate a reply. Data sent through OpenAI&apos;s API is not used to train
            its models.
          </li>
        </ul>
        <p>We may also disclose information if required by law.</p>
      </Section>

      <Section heading="Retention and deletion">
        <p>
          Your goals stay in your account until you delete them; deleting a goal removes it and everything
          in it from our database. To delete your account and all of its data, email us at the address
          below and we will do so within 30 days.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Data is sent over encrypted connections (HTTPS), and each account can only read its own goals. No
          method of storage or transmission is completely secure, but we work to protect your information.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The app is not intended for children under 13. If you believe a child under 13 has given us
          information, contact us and we will delete it.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If we change this policy we will update the date at the top of this page, and for significant
          changes we will tell you in the app.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
