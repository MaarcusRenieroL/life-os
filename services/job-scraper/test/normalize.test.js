import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalize } from '../src/normalize.js';
import { dedupe } from '../src/dedup.js';

test('normalize maps a schema.org JobPosting', () => {
  const job = normalize(
    {
      '@type': 'JobPosting',
      title: 'Senior Backend Engineer',
      hiringOrganization: { name: 'Acme', industry: 'Software' },
      jobLocation: { address: { addressLocality: 'Remote' } },
      datePosted: '2026-08-30',
      url: 'https://acme.example/jobs/1',
      description: 'Java, Spring Boot. Contact recruiter@acme.example',
      baseSalary: { currency: 'EUR', value: { minValue: 70000, maxValue: 90000 } },
    },
    'acme',
  );

  assert.equal(job.title, 'Senior Backend Engineer');
  assert.equal(job.company, 'Acme');
  assert.equal(job.seniorityLevel, 'SENIOR');
  assert.equal(job.workModel, 'REMOTE');
  assert.equal(job.salaryMin, 70000);
  assert.equal(job.currency, 'EUR');
  assert.equal(job.recruiterEmail, 'recruiter@acme.example');
});

test('normalize returns null without a title or company', () => {
  assert.equal(normalize({ title: 'x' }, 's'), null);
});

test('dedupe collapses by url', () => {
  const jobs = [
    { url: 'https://a/1', title: 'A', company: 'C' },
    { url: 'https://a/1', title: 'A dup', company: 'C' },
    { url: 'https://a/2', title: 'B', company: 'C' },
  ];
  assert.equal(dedupe(jobs).length, 2);
});
