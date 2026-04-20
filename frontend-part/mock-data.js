/**
 * mock-data.js — HomeFix
 * Kept only for the default review set shown on worker profiles
 * before per-worker API reviews have loaded (or as a fallback when
 * the API returns an empty list).
 *
 * All other mock data (employees, bookings, requests, users) has been
 * replaced by live API calls. Do not add new mock data here.
 */
(function (global) {
    'use strict';

    global.HomeFixMock = {
        /** Shown on worker profiles until the /workers/<id>/reviews/ API responds. */
        defaultProfileReviews: [
            { author: 'Mona T.',   stars: 5, date: 'March 2025',    text: 'Excellent work! Fixed the issue quickly and left everything clean.' },
            { author: 'Karim B.',  stars: 5, date: 'February 2025', text: 'Very professional and punctual. Highly recommended.' },
            { author: 'Nadia S.',  stars: 4, date: 'January 2025',  text: 'Good job overall, explained everything clearly before starting.' },
            { author: 'Hassan R.', stars: 5, date: 'December 2024', text: 'Best service I have hired. Will definitely call again.' },
        ],
    };
})(typeof window !== 'undefined' ? window : globalThis);
