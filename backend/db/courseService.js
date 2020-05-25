/* eslint linebreak-style: ["error", "windows"] */
const { pool } = require('./init');

/**
 * Add an Course
 * @param {Object} course new course item object
 * @return {Object}
 */
const addCourse = (course, createdBy) => new Promise((resolve, reject) => {
  const { courseCode, courseName, coursePersonal } = course;
  pool.query("SELECT * FROM users WHERE id = $1 AND user_type > 'student'", [createdBy])
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('created_by is not a teacher/admin. Can not create course.');
        error.code = 401;
        throw error;
      }
      pool.query(`INSERT INTO course 
      (course_code, course_name, course_personal, created_by)
      VALUES ($1, $2, $3, $4) RETURNING id`,
      [courseCode, courseName, coursePersonal, createdBy])
        .then((addData) => {
          resolve({ message: `Course added with ID: ${addData.rows[0].id}` });
        })
        .catch((error) => {
          reject(error);
        });
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * Get an course by ID
 * @param {Number} courseId ID of the course
 * @return {Object}
 */
const getCourseById = (courseId) => new Promise((resolve, reject) => {
  pool.query(`SELECT course."id" as course_id, course."course_code", course."course_name", course."course_personal"
  FROM course
  WHERE course."id" = $1`, [courseId])
    .then((courseData) => {
      if (courseData.rowCount > 0) {
        pool.query(`SELECT users.id, users.first_name, users.last_name
        FROM users
        WHERE users.id = ANY($1)`,
        [courseData.rows[0].course_personal])
          .then((userData) => {
            /* eslint-disable no-param-reassign */
            courseData.rows[0].course_personal = userData.rows;
            /* eslint-enable no-param-reassign */
            resolve(courseData.rows[0]);
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        const error = new Error(`Course ID: ${courseId} not found`);
        error.code = 404;
        throw error;
      }
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * Get all course
 * @return {Object}
 */
const getCourses = function getCourses() {
  return new Promise((resolve, reject) => {
    pool.query('SELECT course.id as course_id, course."course_code", course."course_name", course."course_personal" FROM course')
      .then((data) => {
        if (data.rowCount > 0) {
          const promises = data.rows.map((course) => (
            getCourseById(course.course_id).then((result) => result)));
          Promise.all(promises).then((results) => {
            resolve(results);
          })
            .catch((error) => {
              reject(error);
            });
        } else {
          resolve({ message: 'No course available' });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Update a course
 * @param {Number} courseId ID of the course
 * @param {Object} course Update course info
 * @return {Object}
 */
const updateCourse = function updateCourse(courseId, course, updatedBy) {
  return new Promise((resolve, reject) => {
    const { courseCode, courseName, coursePersonal } = course;
    pool.query(`SELECT * FROM users WHERE id = $1
    AND user_type > 'student'`, [updatedBy])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error('updated_by is not a teacher/admin. Can not update course.');
          error.code = 401;
          throw error;
        }
        pool.query(`UPDATE course set course_code = $1, course_name = $2,
        course_personal = $3, updated_by = $4
        WHERE id = $5 RETURNING id`, [courseCode, courseName, coursePersonal, updatedBy, courseId])
          .then((updateData) => {
            if (updateData.rowCount === 0) {
              const error = new Error(`Course ID: ${courseId} not found`);
              error.code = 404;
              throw error;
            }
            resolve({ message: `Course ID: ${updateData.rows[0].id} updated successfully` });
          })
          .catch((error) => {
            reject(error, 404);
          });
      })
      .catch((error) => {
        reject(error, 401);
      });
  });
};

/**
 * Delete a course
 * @param {Number} courseId ID of the course
 * @return {Object}
 */
const deleteCourse = function deleteCourse(courseId) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM course WHERE id = $1', [courseId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Course ID: ${courseId} not found`);
          error.code = 404;
          throw error;
        }
        pool.query('DELETE FROM course WHERE id = $1 RETURNING id', [courseId])
          .then((deleteData) => {
            if (deleteData.rowCount === 0) {
              const error = new Error(`Delete course ID: ${courseId} failed`);
              error.code = 404;
              throw error;
            }
            resolve({ message: `Course ID: ${courseId} deleted successfully` });
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Get all courses where user is course personal
 * @param {Number} teacherId ID of the teacher
 * @return {Array}
 */
const getTeacherWiseCourses = function getTeacherWiseCourses(teacherId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT course.id as course_id FROM course WHERE ${teacherId} = ANY(course_personal)`)
      .then((data) => {
        if (data.rowCount > 0) {
          const promises = data.rows.map((course) => (
            getCourseById(course.course_id).then((result) => result)));
          Promise.all(promises).then((results) => {
            resolve(results);
          })
            .catch((error) => {
              reject(error);
            });
        } else {
          resolve({ message: 'No course available' });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  addCourse,
  getCourseById,
  getCourses,
  updateCourse,
  deleteCourse,
  getTeacherWiseCourses,
};
