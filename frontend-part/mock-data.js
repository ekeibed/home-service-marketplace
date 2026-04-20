/**
 * Central mock data for the HomeFix static prototype.
 * Load this file before app.js in every HTML page.
 * Replace with API responses when the backend is connected.
 */
(function (global) {
    'use strict';

    global.HomeFixMock = {
        /** Matches filter dropdowns / landing categories */
        serviceCategories: [
            'Cleaning',
            'Plumbing',
            'Electrical',
            'Painting',
            'Carpentry',
            'Moving',
        ],

        /** Customer browse cards — id links to employee-profile.html?id= */
        employees: [
            { id: 1, name: 'Ahmed Karim', initials: 'AK', photo: 'https://randomuser.me/api/portraits/men/32.jpg', service: 'Plumbing', rating: 4.9, reviews: 38, bio: '8 years experience. Leaks, pipes, full installations.', area: 'Üsküdar', hourlyRate: 150, available: true },
            { id: 2, name: 'Sara Reyes', initials: 'SR', photo: 'https://randomuser.me/api/portraits/women/44.jpg', service: 'Electrical', rating: 4.8, reviews: 52, bio: 'Certified electrician. Wiring, panels, outlets.', area: 'Kadıköy', hourlyRate: 180, available: true },
            { id: 3, name: 'Mohamed Nour', initials: 'MN', photo: 'https://randomuser.me/api/portraits/men/45.jpg', service: 'Painting', rating: 4.7, reviews: 29, bio: 'Interior & exterior painting. Clean and precise work.', area: 'Ümraniye', hourlyRate: 120, available: false },
            { id: 4, name: 'Lina Hamdan', initials: 'LH', photo: 'https://randomuser.me/api/portraits/women/68.jpg', service: 'Cleaning', rating: 4.9, reviews: 61, bio: 'Deep clean specialist. Homes, offices, move-out cleans.', area: 'Beşiktaş', hourlyRate: 100, available: true },
            { id: 5, name: 'Omar Fathi', initials: 'OF', photo: 'https://randomuser.me/api/portraits/men/52.jpg', service: 'Carpentry', rating: 4.6, reviews: 17, bio: 'Custom furniture, doors, shelving. Quality woodwork.', area: 'Kadıköy', hourlyRate: 200, available: true },
            { id: 6, name: 'Yasmin Saleh', initials: 'YS', photo: 'https://randomuser.me/api/portraits/women/21.jpg', service: 'Moving', rating: 4.5, reviews: 23, bio: 'Full moving service. Packing, transport, unpacking.', area: 'Ümraniye', hourlyRate: 130, available: true },
            { id: 7, name: 'Khaled Mostafa', initials: 'KM', photo: 'https://randomuser.me/api/portraits/men/11.jpg', service: 'Plumbing', rating: 4.4, reviews: 14, bio: 'Bathroom fittings, pipe repair, water heaters.', area: 'Üsküdar', hourlyRate: 140, available: false },
            { id: 8, name: 'Dina Ashraf', initials: 'DA', photo: 'https://randomuser.me/api/portraits/women/55.jpg', service: 'Cleaning', rating: 4.8, reviews: 44, bio: 'Regular and deep cleaning. Eco-friendly products available.', area: 'Beşiktaş', hourlyRate: 110, available: true },
        ],

        /** Shown on worker profiles until per-worker review API exists */
        defaultProfileReviews: [
            { author: 'Mona T.', stars: 5, date: 'March 2025', text: 'Excellent work! Fixed the leak quickly and left everything clean.' },
            { author: 'Karim B.', stars: 5, date: 'Feb 2025', text: 'Very professional and on time. Highly recommend.' },
            { author: 'Nadia S.', stars: 4, date: 'Jan 2025', text: 'Good job overall, explained everything clearly.' },
            { author: 'Hassan R.', stars: 5, date: 'Dec 2024', text: 'Best plumber I have hired. Will call again.' },
        ],

        /** My Account → Bookings; id = worker id for View Profile; bookingId = stable row id for admin */
        initialCustomerBookings: [
            { bookingId: 9001, id: 1, name: 'Ahmed Karim', initials: 'AK', customer: 'Mona Tarek', service: 'Plumbing', date: 'April 10, 2025', status: 'completed' },
            { bookingId: 9002, id: 4, name: 'Lina Hamdan', initials: 'LH', customer: 'Karim Bassam', service: 'Cleaning', date: 'April 3, 2025', status: 'confirmed' },
            { bookingId: 9003, id: 2, name: 'Sara Reyes', initials: 'SR', customer: 'Nadia Salem', service: 'Electrical', date: 'March 28, 2025', status: 'pending' },
        ],

        /** Professional dashboard — status: pending | accepted | rejected */
        initialWorkerRequests: [
            { id: 501, customer: 'Mona Tarek', initials: 'MT', service: 'Plumbing', address: 'Bağdat Cd., Kadıköy', when: 'Apr 22, 2026 · 2:00 PM', problem: 'Kitchen sink leaking under the cabinet.', status: 'pending' },
            { id: 502, customer: 'Karim Bassam', initials: 'KB', service: 'Plumbing', address: 'Mimoza Sk., Üsküdar', when: 'Apr 23, 2026 · 10:30 AM', problem: 'Replace bathroom faucet and check water pressure.', status: 'pending' },
            { id: 503, customer: 'Nadia Salem', initials: 'NS', service: 'Plumbing', address: 'Barbaros, Beşiktaş', when: 'Apr 18, 2026 · 4:00 PM', problem: 'Water heater not heating properly.', status: 'accepted' },
        ],

        /** Admin panel queue */
        initialPendingWorkerApplications: [
            { id: 801, name: 'Ali Demir', email: 'ali.demir@example.com', phone: '+90 532 111 2233', service: 'Electrical', submitted: 'Apr 12, 2026' },
            { id: 802, name: 'Selin Yılmaz', email: 'selin.y@example.com', phone: '+90 533 444 5566', service: 'Cleaning', submitted: 'Apr 14, 2026' },
        ],
    };
})(typeof window !== 'undefined' ? window : globalThis);
