-- Booking tables used by counsellorController and sessionController.

CREATE TABLE IF NOT EXISTS counsellors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL DEFAULT 'General Counselling',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS availability_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    counsellor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    counsellor_id INT NOT NULL,
    slot_id INT NOT NULL UNIQUE,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (counsellor_id) REFERENCES counsellors(id),
    FOREIGN KEY (slot_id) REFERENCES availability_slots(id)
);