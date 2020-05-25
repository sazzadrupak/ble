CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE userType AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id uuid DEFAULT uuid_generate_v4 (),
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email text not null UNIQUE,
  password text NOT NULL,
  user_type userType
);

INSERT INTO users (first_name, last_name, email, password, user_type)
VALUES
  ('student', 'one', 'student.one@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('student', 'two', 'student.two@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('student', 'three', 'student.three@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('teacher', 'one', 'teacher.one@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('teacher', 'two', 'teacher.two@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('teacher', 'three', 'teacher.three@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('admin', 'one', 'admin.one@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'admin');

CREATE TABLE beacon (
  id SERIAL PRIMARY KEY,
  mac_address VARCHAR(255) NOT NULL UNIQUE,
  active_status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id)
);

CREATE TABLE beacon_room (
  beacon_id INT REFERENCES beacon(id) ON DELETE CASCADE UNIQUE,
  room_id INT REFERENCES room(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  PRIMARY KEY (beacon_id, room_id)
);

CREATE TABLE course (
  id SERIAL PRIMARY KEY,
  course_code VARCHAR NOT NULL UNIQUE,
  course_name VARCHAR NOT NULL,
  course_personal INT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INT REFERENCES users(id)
);

CREATE TABLE event (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES course(id),
  room_id INT REFERENCES room(id),
  event_name VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  event_personal INT REFERENCES users(id),
  accept_attendance BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  event_id INT REFERENCES event(id) NOT NULL,
  student_id INT REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Helsinki'),
  PRIMARY KEY (event_id, student_id)
);

BEGIN;

CREATE FUNCTION check_course_personal_as_teacher() RETURNS TRIGGER AS $$
  DECLARE teacherCount INTEGER;
	BEGIN
	  SELECT count(users.id) INTO teacherCount FROM users WHERE users.id = ANY (NEW."course_personal") AND users."user_type" = 'teacher';
    IF (teacherCount != array_length(NEW."course_personal", 1)) THEN
      RAISE restrict_violation USING MESSAGE = 'All given course_personal is not teacher';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkCoursePersonalAsTeacher BEFORE INSERT OR UPDATE ON course FOR EACH ROW
	EXECUTE PROCEDURE check_course_personal_as_teacher();

COMMIT;

BEGIN;

CREATE FUNCTION check_event_personal_is_in_course_personal_list() RETURNS TRIGGER AS $$
  DECLARE teachers INTEGER ARRAY;
	BEGIN
	  SELECT course.course_personal INTO teachers FROM course WHERE course.id = NEW."course_id";
    IF (array_length(teachers, 1) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'Course not found';
    END IF;
    IF (array_position(teachers, NEW.event_personal) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'The event personal is not found in this course personal list';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkEventPersonalIsInCoursePersonalList BEFORE INSERT OR UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_event_personal_is_in_course_personal_list();

COMMIT;

BEGIN;

CREATE FUNCTION check_create_by_is_in_course_personal_list() RETURNS TRIGGER AS $$
  DECLARE teachers INTEGER ARRAY;
	BEGIN
	  SELECT course.course_personal INTO teachers FROM course WHERE course.id = NEW."course_id";
    IF (array_length(teachers, 1) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'Course not found';
    END IF;
    IF (array_position(teachers, NEW.created_by) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'User who is creating this event is not related to this course';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkCreateByIsICoursePersonalList BEFORE INSERT ON event FOR EACH ROW
	EXECUTE PROCEDURE check_create_by_is_in_course_personal_list();

COMMIT;

BEGIN;

CREATE FUNCTION check_duplicate_event_in_same_time() RETURNS TRIGGER AS $$
  DECLARE eventCountStartTime INTEGER;
  DECLARE eventCountEndTime INTEGER;
	BEGIN
    SELECT count(*) INTO eventCountStartTime FROM event WHERE event."room_id" = NEW."room_id"
    AND NEW."start_time" >= event."start_time" AND NEW."start_time" <= event."end_time";
    IF (eventCountStartTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'There is a event already in same time in same room';
    END IF;

    SELECT count(*) INTO eventCountEndTime FROM event WHERE event."room_id" = NEW."room_id"
    AND NEW."end_time" >= event."start_time" AND NEW."end_time" <= event."end_time";
    IF (eventCountEndTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'There is a event already in same time in same room';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkDuplicateEvent BEFORE INSERT ON event FOR EACH ROW
	EXECUTE PROCEDURE check_duplicate_event_in_same_time();

COMMIT;

BEGIN;

CREATE FUNCTION check_duplicate_event_in_same_time_update() RETURNS TRIGGER AS $$
  DECLARE eventCountStartTime INTEGER;
  DECLARE eventCountEndTime INTEGER;
	BEGIN
    SELECT count(*) INTO eventCountStartTime FROM event WHERE event.id != OLD.id AND event."room_id" = NEW."room_id"
    AND NEW."start_time" >= event."start_time" AND NEW."start_time" <= event."end_time";
    IF (eventCountStartTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'There is a event already in same time in same room';
    END IF;

    SELECT count(*) INTO eventCountEndTime FROM event WHERE event.id != OLD.id AND event."room_id" = NEW."room_id"
    AND NEW."end_time" >= event."start_time" AND NEW."end_time" <= event."end_time";
    IF (eventCountEndTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'There is a event already in same time in same room';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkDuplicateEventUpdate BEFORE UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_duplicate_event_in_same_time_update();

COMMIT;

BEGIN;

CREATE FUNCTION check_datetime_before_event_status_change() RETURNS TRIGGER AS $$
  DECLARE eventCount INTEGER;
  DECLARE userCount INTEGER;
	BEGIN
    SET timezone = 'Europe/Helsinki';
	  SELECT count(event.id) INTO eventCount FROM event WHERE event.id = NEW.id AND event.start_time <= CURRENT_TIMESTAMP AND event.end_time >= CURRENT_TIMESTAMP;
    IF (eventCount = 0) THEN
      RAISE restrict_violation USING MESSAGE = 'Current time is not in between event start and end time.';
    END IF;
    SELECT count(event.id) INTO userCount FROM event WHERE event.id = NEW.id AND event.event_personal = NEW.updated_by;
    IF (userCount = 0) THEN
      RAISE restrict_violation USING MESSAGE = 'User is not taking this event. Can not modify this event.';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkDatetimeBeforeEventStatusChange BEFORE UPDATE OF accept_attendance ON event FOR EACH ROW
	EXECUTE PROCEDURE check_datetime_before_event_status_change();

COMMIT;

BEGIN;

CREATE FUNCTION check_attendance_record_of_event() RETURNS TRIGGER AS $$
  DECLARE attendanceCount INTEGER;
	BEGIN
	  SELECT count(*) INTO attendanceCount FROM attendance WHERE event_id = OLD.id;
    IF (attendanceCount > 0) THEN
      RAISE restrict_violation USING MESSAGE = 'Attendance already taken against this event. Can not delete.';
    END IF;
    RETURN OLD;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkAttendanceRecordOfEvent BEFORE DELETE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_attendance_record_of_event();

COMMIT;

BEGIN;
CREATE FUNCTION check_dates_and_times_of_event() RETURNS TRIGGER AS $$
  DECLARE start_date_time TIMESTAMP;
  DECLARE end_date_time TIMESTAMP;
	BEGIN
    SELECT NEW."start_time"::timestamp INTO start_date_time;
    SELECT NEW."end_time"::timestamp INTO end_date_time;
    IF (start_date_time > end_date_time) THEN
      RAISE restrict_violation USING MESSAGE = 'start date_time should be smaller than end date_time.';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkDateAndTimeOfEvent BEFORE INSERT OR UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_dates_and_times_of_event();

COMMIT;

BEGIN;

CREATE FUNCTION check_event_personal_taking_event_at_same_time_insert() RETURNS TRIGGER AS $$
  DECLARE eventCountStartTime INTEGER;
  DECLARE eventCountEndTime INTEGER;
	BEGIN
    SELECT count(*) INTO eventCountStartTime FROM event WHERE event."event_personal" = NEW."event_personal"
    AND (NEW."start_time" >= event."start_time" AND NEW."start_time" <= event."end_time");
    IF (eventCountStartTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'Teacher already been assigned to an event at the very same time';
    END IF;

    SELECT count(*) INTO eventCountEndTime FROM event WHERE event."event_personal" = NEW."event_personal"
    AND (NEW."end_time" >= event."start_time" AND NEW."end_time" <= event."end_time");
    IF (eventCountEndTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'Teacher already been assigned to an event at the very same time';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkEventPersonalTakingEventAtSameTimeInsert BEFORE INSERT ON event FOR EACH ROW
	EXECUTE PROCEDURE check_event_personal_taking_event_at_same_time_insert();

COMMIT;

BEGIN;

CREATE FUNCTION check_event_personal_taking_event_at_same_time_update() RETURNS TRIGGER AS $$
  DECLARE eventCountStartTime INTEGER;
  DECLARE eventCountEndTime INTEGER;
	BEGIN
    SELECT count(*) INTO eventCountStartTime FROM event WHERE event."id" != OLD."id" AND event."event_personal" = NEW."event_personal"
    AND (NEW."start_time" >= event."start_time" AND NEW."start_time" <= event."end_time");
    IF (eventCountStartTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'Teacher already been assigned to an event at the very same time';
    END IF;

    SELECT count(*) INTO eventCountEndTime FROM event WHERE event."id" != OLD."id" AND event."event_personal" = NEW."event_personal"
    AND (NEW."end_time" >= event."start_time" AND NEW."end_time" <= event."end_time");
    IF (eventCountEndTime > 0) THEN
      RAISE unique_violation USING MESSAGE = 'Teacher already been assigned to an event at the very same time';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkEventPersonalTakingEventAtSameTimeUpdate BEFORE INSERT OR UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_event_personal_taking_event_at_same_time_update();

COMMIT;

BEGIN;

CREATE FUNCTION check_user_in_course_personal_before_edit() RETURNS TRIGGER AS $$
  DECLARE teachers INTEGER ARRAY;
	BEGIN
	  SELECT course.course_personal INTO teachers FROM course WHERE course.id = NEW."course_id";
    IF (array_length(teachers, 1) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'Course not found';
    END IF;
    IF (array_position(teachers, NEW.updated_by) IS NULL) THEN
      RAISE restrict_violation USING MESSAGE = 'User who is updating this event is not related to given course';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkUserInCoursePersonalBeforeEdit BEFORE UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_user_in_course_personal_before_edit();

COMMIT;

BEGIN;

CREATE FUNCTION check_room_exist() RETURNS TRIGGER AS $$
  DECLARE roomCount INTEGER;
	BEGIN
	  SELECT count(*) INTO roomCount FROM room WHERE room.id = NEW."room_id";
    IF (roomCount = 0) THEN
      RAISE restrict_violation USING MESSAGE = 'Room not found';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkRoomExist BEFORE INSERT OR UPDATE ON event FOR EACH ROW
	EXECUTE PROCEDURE check_room_exist();

COMMIT;

/*
INSERT INTO users (first_name, last_name, email, password, user_type)
VALUES
  ('Towfiqul', 'Omi', 'towfiqul.omi@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Ariful', 'Islam', 'ariful.islam@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Sazzad', 'Rupak', 'sazzad.rupak@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Ali', 'Gulzhar', 'ali.gulzhar@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Topi', 'Haavisto', 'topi.haavisto@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Jani', 'Kuitti', 'jani.kuitti@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Usama', 'Rafique', 'usama.rafique@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'student'),
  ('Ulla-talvikki', 'virta', 'ulla-talvikki.virta@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Teemu', 'Lukkarinen', 'teemu.lukkarinen@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Valentina', 'Gulzhar', 'valentina.lenarduzzi@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Tero', 'Ahtee', 'tero.ahtee@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Teacher', 'one', 'teacher.one@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Teacher', 'Two', 'teacher.two@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('Teacher', 'Three', 'teacher.three@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'teacher'),
  ('admin', 'one', 'admin.one@tuni.fi', '$2b$10$RzjzR3at1fw2uOav4IlMnupX.z7SakLHI78WGF2A6eU0bHWXj/Mxu', 'admin');
*/