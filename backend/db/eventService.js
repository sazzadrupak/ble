/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */
const _ = require('lodash');
const { pool } = require('./init');

/*
 * Generate an one day event as string
 * @param {Object} event
 * @param {Number} createdBy
 * @return {String}
 */
function oneDayEvent(event, createdBy) {
  const startDate = `${event.startDate} ${event.startTime}`;
  const endDate = `${event.endDate} ${event.endTime}`;
  return `(${event.courseId}, ${event.roomId}, '${event.eventName}', '${event.eventType}', '${startDate}', '${endDate}', ${event.eventPersonal}, ${createdBy})`;
}

/*
 * Generate daily event as string
 * @param {Object} event
 * @param {Number} createdBy
 * @return {String}
 */
function dailyEvents(event, createdBy) {
  const newEventsList = [];
  const dateMove = new Date(event.startDate);
  let strDate = event.startDate;

  while (strDate < event.endDate) {
    strDate = dateMove.toISOString().slice(0, 10);
    const startDate = `${strDate} ${event.startTime}`;
    const endDate = `${strDate} ${event.endTime}`;
    const eventInfo = `(${event.courseId}, ${event.roomId}, '${event.eventName}', '${event.eventType}', '${startDate}', '${endDate}', ${event.eventPersonal}, ${createdBy})`;
    newEventsList.push(eventInfo);
    dateMove.setDate(dateMove.getDate() + 1);
  }
  return newEventsList.join(', ');
}

/*
 * Generate recurrent events and make a string from it
 * @param {Object} event
 * @param {Number} createdBy
 * @return {String}
 */
function recurrentEvents(event, createdBy) {
  const newEventsList = [];
  const dateMove = new Date(event.startDate);
  let strDate = event.startDate;

  while (strDate <= event.endDate) {
    strDate = dateMove.toISOString().slice(0, 10);
    const startDate = `${strDate} ${event.startTime}`;
    const endDate = `${strDate} ${event.endTime}`;
    const eventInfo = `(${event.courseId}, ${event.roomId}, '${event.eventName}', '${event.eventType}', '${startDate}', '${endDate}', ${event.eventPersonal}, ${createdBy})`;
    newEventsList.push(eventInfo);
    if (event.everyAfterType === 'day') {
      dateMove.setDate(dateMove.getDate() + event.everyAfter);
    } else if (event.everyAfterType === 'week') {
      dateMove.setDate(dateMove.getDate() + (event.everyAfter * 7));
    }
    strDate = dateMove.toISOString().slice(0, 10);
  }
  return newEventsList.join(', ');
}

/*
 * Save new event(s) into database
 * @param {String} newEventInfo
 * @return {Object}
 */
function addEventBetweenDates(newEventInfo) {
  return new Promise((resolve, reject) => {
    pool.query(`INSERT INTO event 
        (course_id, room_id, event_name, event_type, start_time, end_time, event_personal, created_by)
        VALUES ${newEventInfo}`)
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error('No event created');
          error.code = 404;
          throw error;
        }
        resolve({
          message: `${data.rowCount} event has been added`,
        });
      })
      .catch((error) => {
        const errorInfo = {
          code: 404,
          message: error.message,
        };
        reject(errorInfo);
      });
  });
}

/*
 * Add an event
 * @param {Object} newEvent
 * @param {Number} createdBy
 * @return {Object}
 */
const addEvent = function (newEvent, createdBy) {
  return new Promise((resolve, reject) => {
    const {
      eventPersonal,
      startDate,
      endDate,
      recurrent,
    } = newEvent;
    /* eslint-disable quotes */
    pool.query(`SELECT * FROM users WHERE id = $1 AND user_type = 'teacher'`, [eventPersonal])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`event_personal is not a teacher.`);
          error.code = 401;
          throw error;
        }
        let modifiedEventList;
        if (new Date(startDate).getTime() <= new Date(endDate).getTime()) {
          if (recurrent === false) { // if the event is a daily event
            const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
            if (diff === 0) {
              modifiedEventList = oneDayEvent(newEvent, createdBy);
            } else {
              modifiedEventList = dailyEvents(newEvent, createdBy);
            }
          } else { // if the event is no daily, happens after some days/weeks later
            const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
            if (diff === 0) {
              modifiedEventList = oneDayEvent(newEvent, createdBy);
            } else {
              modifiedEventList = recurrentEvents(newEvent, createdBy);
            }
          }
          return addEventBetweenDates(modifiedEventList)
            .then((result) => {
              resolve(result);
            })
            .catch((error) => {
              reject(error);
            });
        }
        const error = new Error('start date_time should be smaller than end date_time.');
        error.code = 404;
        throw error;
      })
      .catch((error) => {
        reject(error);
      });
    /* eslint-enable quotes */
  });
};

/**
 * Change event status
 * @param {Number} eventId
 * @param {Number} updatedBy
 * @return {Object}
 */
const changeEventStatus = function (eventId, updatedBy) {
  return new Promise((resolve, reject) => {
    pool.query(`UPDATE event set accept_attendance = NOT accept_attendance, updated_by = $1
      WHERE id = $2
      RETURNING *`, [updatedBy, eventId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Event id ${eventId} not found.`);
          error.code = 404;
          throw error;
        }
        resolve({
          status: data.rows[0].accept_attendance,
          message: `Event status has been changed from ${!data.rows[0].accept_attendance} to ${data.rows[0].accept_attendance}`,
        });
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Update an event
 * @param {Object} eventData
 * @param {Integer} eventId
 * @param {Integer} updatedBy
 * @return {Object}
 */
const updateEvent = function (eventData, eventId, updatedBy) {
  const {
    courseId,
    eventPersonal,
    eventName,
    eventType,
    roomId,
    startTime,
    endTime,
    startDate,
    endDate,
  } = eventData;
  return new Promise((resolve, reject) => {
    /* eslint-disable quotes */
    pool.query(`SELECT * FROM users WHERE id = $1 AND user_type = 'teacher'`, [eventPersonal])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`event_personal is not a teacher.
          Can not assign event to the user.`);
          error.code = 401;
          throw error;
        }
        pool.query(`SELECT room_id, to_char(start_time, 'YYYY-MM-DD HH24:MI:SS') as start_time,
        to_char(end_time, 'YYYY-MM-DD HH24:MI:SS') as end_time
        from event WHERE id = $1 LIMIT 1`, [eventId])
          .then((checkEvent) => {
            if (checkEvent.rowCount === 0) {
              const error = new Error(`Event id ${eventId} not found.`);
              error.code = 404;
              throw error;
            }

            if (new Date(startDate).getTime() <= new Date(endDate).getTime()) {
              const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
              if (diff === 0) {
                const newStartDateTime = `${startDate} ${startTime}`;
                const newEndDateTime = `${endDate} ${endTime}`;
                // to check if the event is assigned to same time of another event
                if (
                  checkEvent.rows[0].room_id === roomId
                  && checkEvent.rows[0].start_time === newStartDateTime
                  && checkEvent.rows[0].end_time === newEndDateTime
                ) {
                  pool.query(`UPDATE event set course_id = $1, room_id = $2, event_name = $3,
                    event_type = $4, start_time = $5, end_time = $6, event_personal = $7, updated_by = $8
                    WHERE id = $9 RETURNING *`, [
                    courseId,
                    roomId,
                    eventName,
                    eventType,
                    newStartDateTime,
                    newEndDateTime,
                    eventPersonal,
                    updatedBy,
                    eventId,
                  ])
                    .then((updateData) => {
                      if (updateData.rowCount === 0) {
                        const error = new Error('Event update is not successful');
                        error.code = 404;
                        throw error;
                      }
                      resolve({ message: 'Event has been updated successfully.' });
                    })
                    .catch((error) => {
                      reject(error, 404);
                    });
                } else {
                  pool.query(`SELECT * from event WHERE room_id = $1
                  AND start_time >= $2 AND end_time <= $3`, [roomId, newStartDateTime, newEndDateTime])
                    .then((checkRoom) => {
                      if (checkRoom.rowCount > 0) {
                        const error = new Error('This room has been occupied by other event in the same time.');
                        error.code = 404;
                        throw error;
                      }
                      pool.query(`UPDATE event set course_id = $1, room_id = $2, event_name = $3,
                      event_type = $4, start_time = $5, end_time = $6, event_personal = $7, updated_by = $8
                      WHERE id = $9 RETURNING *`, [
                        courseId,
                        roomId,
                        eventName,
                        eventType,
                        newStartDateTime,
                        newEndDateTime,
                        eventPersonal,
                        updatedBy,
                        eventId,
                      ])
                        .then((updateEventInfo) => {
                          if (updateEventInfo.rowCount === 0) {
                            const error = new Error('Event update is not successful');
                            error.code = 404;
                            throw error;
                          }
                          resolve({ message: 'Event has been updated successfully.' });
                        })
                        .catch((error) => {
                          reject(error, 404);
                        });
                    })
                    .catch((error) => {
                      reject(error, 404);
                    });
                }
              } else {
                const error = new Error('Update an event accept start and end date to be same.');
                error.code = 404;
                throw error;
              }
            } else {
              const error = new Error('start date_time should be smaller than end date_time....');
              error.code = 404;
              throw error;
            }
          })
          .catch((error) => {
            reject(error, 404);
          });
      })
      .catch((error) => {
        reject(error, 404);
      });
    /* eslint-enable quotes */
  });
};

/**
 * Get an event by event ID
 * @param {Number} eventId
 * @param {Number} userId
 * @return {Object}
 */
const getEventbyId = function (eventId, userId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT event.id, course.id as "courseId", course."course_code" as "courseCode", course."course_name" as "courseName", course."course_personal",
      event."event_personal" as "eventPersonal", users."first_name" as "firstName", users."last_name" as "lastName",
      event.event_name as "eventName", event.event_type as "eventType", event."accept_attendance" as "acceptAttendance", event."created_by",
      concat_ws(' ', DATE(event.start_time), to_char(CAST(event.start_time::timestamp as time without time zone), 'HH24:MI:SS')) as "startDateTime",
      concat_ws(' ', DATE(event.end_time), to_char(CAST(event.end_time::timestamp as time without time zone), 'HH24:MI:SS')) as "endDateTime",
      room.id as "roomId", room."name" as "roomName"
      FROM event
      LEFT JOIN course on event."course_id" = course."id"
      LEFT JOIN room on event."room_id" = room."id"
      LEFT JOIN users on event."event_personal" = users."id"
      WHERE event.id = $1`, [eventId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Event id ${eventId} not found.`);
          error.code = 404;
          throw error;
        }
        if (data.rows[0].course_personal.includes(userId)) {
          const row = _.omit(data.rows[0], ['created_by', 'course_personal']);
          resolve(row);
        } else {
          const error = new Error('User does not have permission to view this event');
          error.code = 401;
          throw error;
        }
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Get all events assigned to a user
 * @param {Number} userId
 * @return {Object}
 */
const getAllEventsAssignedToUser = function (userId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT event.id, event.event_name as "eventName", event.event_type as "eventType",
      concat_ws(' ', DATE(event.start_time), to_char(CAST(event.start_time::timestamp as time without time zone), 'HH24:MI:SS')) as "startDateTime",
      concat_ws(' ', DATE(event.end_time), to_char(CAST(event.end_time::timestamp as time without time zone), 'HH24:MI:SS')) as "endDateTime",
      event."accept_attendance", course."course_code" as courseCode, course."course_name" as courseName, course."id" as courseId,
      room."name" as roomName, room."id" as roomId, users."first_name" as firstName, users."last_name" as lastName
      FROM event
      LEFT JOIN course on event."course_id" = course."id"
      LEFT JOIN room on event."room_id" = room."id"
      LEFT JOIN users on event."event_personal" = users."id"
      WHERE event.event_personal = $1`, [userId])
      .then((data) => {
        if (data.rowCount > 0) {
          resolve(data.rows);
        } else {
          resolve({ message: 'No events has been assigned to this user' });
        }
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Delete an event
 * @param {Number} userId
 * @param {Number} eventId
 * @return {Object}
 */
const deleteEvent = function (eventId, userId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT course."course_personal"
      FROM event
      LEFT JOIN course on event."course_id" = course."id"
      WHERE event.id = $1`, [eventId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Event id ${eventId} not found.`);
          error.code = 404;
          throw error;
        }
        if (data.rows[0].course_personal.includes(userId)) {
          pool.query('DELETE FROM event WHERE id = $1', [eventId])
            .then((deleteData) => {
              if (deleteData.rowCount > 0) {
                resolve({ message: `Event ${eventId} has been deleted successfully` });
              } else {
                const error = new Error('Delete failed');
                error.code = 404;
                throw error;
              }
            })
            .catch((error) => {
              reject(error, 404);
            });
        } else {
          const error = new Error('user has to be one of course person of this course to delete');
          error.code = 401;
          throw error;
        }
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Get all event
 * @return {Object}
 */
const getAllEvents = function () {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT event.id, event.event_name as "eventName", event.event_type as "eventType",
      concat_ws(' ', DATE(event.start_time), to_char(CAST(event.start_time::timestamp as time without time zone), 'HH24:MI:SS')) as "startDateTime",
      concat_ws(' ', DATE(event.end_time), to_char(CAST(event.end_time::timestamp as time without time zone), 'HH24:MI:SS')) as "endDateTime",
      event."accept_attendance" as "acceptAttendance",
      course."course_code" as "courseCode", course."course_name" as "courseName", course."id" as "courseId",
      room."name" as "roomName", room."id" as "roomId", users."first_name" as "firstName", users."last_name" as "lastName",
      event.event_personal as "eventPersonal"
      FROM event
      LEFT JOIN course on event."course_id" = course."id"
      LEFT JOIN room on event."room_id" = room."id"
      LEFT JOIN users on event."event_personal" = users."id"`)
      .then((data) => {
        resolve(data.rows);
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Get student list from a event attendance
 * @param {Number} eventId
 * @return {Object}
 */
const attendanceResult = function (eventId) {
  if (eventId) {
    return new Promise((resolve, reject) => {
      pool.query(`SELECT event.id as event_id, event.event_name as event_name,
        concat_ws(' ', users."first_name", users."last_name") as student_name, users.id as student_id,
        concat_ws(' ', DATE(attendance."created_at"), to_char(CAST(attendance."created_at"::timestamp as time without time zone), 'HH24:MI:SS')) as attendance_time
        FROM attendance
        LEFT JOIN event on attendance."event_id" = event."id"
        LEFT JOIN users on attendance."student_id" = users."id"
        WHERE attendance."event_id" = $1`, [eventId])
        .then((data) => {
          resolve(data.rows);
        })
        .catch((error) => {
          reject(error, 404);
        });
    });
  }
  return new Promise((resolve, reject) => {
    pool.query(`SELECT event.id as event_id, event.event_name as event_name,
      concat_ws(' ', users."first_name", users."last_name") as student_name, users.id as student_id,
      concat_ws(' ', DATE(attendance."created_at"), to_char(CAST(attendance."created_at"::timestamp as time without time zone), 'HH24:MI:SS')) as attendance_time
      FROM attendance
      LEFT JOIN event on attendance."event_id" = event."id"
      LEFT JOIN users on attendance."student_id" = users."id"`)
      .then((data) => {
        resolve(data.rows);
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

/**
 * Get events list of a course
 * @param {Number} courseId
 * @param {Number} userId
 * @return {Array}
 */
const courseEvents = function (courseId, userId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT course.id as course_id FROM course WHERE id = ${courseId} AND ${userId} = ANY(course_personal)`)
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Course ID: ${courseId} not found, or User ID: ${userId} is not course personal of that course`);
          error.code = 404;
          throw error;
        } else {
          pool.query(`SELECT event.id, event.event_name as "eventName", event.event_type as "eventType",
            concat_ws(' ', DATE(event.start_time), to_char(CAST(event.start_time::timestamp as time without time zone), 'HH24:MI:SS')) as "startDateTime",
            concat_ws(' ', DATE(event.end_time), to_char(CAST(event.end_time::timestamp as time without time zone), 'HH24:MI:SS')) as "endDateTime",
            event."accept_attendance" as "acceptAttendance",
            course."course_code" as "courseCode", course."course_name" as "courseName", course."id" as "courseId",
            room."name" as "roomName", room."id" as "roomId", users."first_name" as "firstName", users."last_name" as "lastName",
            event.event_personal as "eventPersonal"
            FROM event
            LEFT JOIN course on event."course_id" = course."id"
            LEFT JOIN room on event."room_id" = room."id"
            LEFT JOIN users on event."event_personal" = users."id"
            WHERE event."course_id" = ${courseId}`)
            .then((eventData) => {
              resolve(eventData.rows);
            })
            .catch((error) => {
              reject(error, 404);
            });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Get events summary of a teacher
 * @param {Number} userId
 * @return {Array}
 */
const eventSumByPersonal = function (userId) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT event.id, event.event_name as "eventName", event.event_type as "eventType",
      concat_ws(' ', DATE(event.start_time), to_char(CAST(event.start_time::timestamp as time without time zone), 'HH24:MI:SS')) as "startDateTime",
      concat_ws(' ', DATE(event.end_time), to_char(CAST(event.end_time::timestamp as time without time zone), 'HH24:MI:SS')) as "endDateTime",
      event."accept_attendance" as "acceptAttendance",
      course."course_code" as "courseCode", course."course_name" as "courseName", course."id" as "courseId",
      room."name" as "roomName", room."id" as "roomId", users."first_name" as "firstName", users."last_name" as "lastName",
      event.event_personal as "eventPersonal"
      FROM event
      LEFT JOIN course on event."course_id" = course."id"
      LEFT JOIN room on event."room_id" = room."id"
      LEFT JOIN users on event."event_personal" = users."id"
      WHERE event."event_personal" = ${userId}`)
      .then((eventData) => {
        if (eventData.rowCount > 0) {
          const allEvents = eventData.rows;
          const uniqueCourses = [];
          allEvents.forEach((item) => {
            const i = uniqueCourses.findIndex((course) => course.course_id === item.courseId);
            if (i <= -1) {
              uniqueCourses.push({
                course_id: item.courseId,
                course_name: item.courseName,
                course_code: item.courseCode,
              });
            }
          });

          const strDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
          const startTime = `${strDate.getFullYear()}-${('0' + (strDate.getMonth() + 1)).slice(-2)}-${('0' + strDate.getDate()).slice(-2)} ${('0' + strDate.getHours()).slice(-2)}:${('0' + strDate.getMinutes()).slice(-2)}:${('0' + strDate.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
          const eventSummary = Promise.all(uniqueCourses.map(async (course) => {
            const courseWiseEvents = _.filter(allEvents, { courseId: course.course_id });
            const uniqueEventType = [];
            courseWiseEvents.map((eventItem) => {
              const i = uniqueEventType.findIndex(
                (event) => event.event_type === eventItem.eventType,
              );
              if (i <= -1) {
                uniqueEventType.push({ event_type: eventItem.eventType });
              }
              return uniqueEventType;
            });
            /* eslint-disable no-param-reassign */
            course.event_type = [];
            /* eslint-disable no-param-reassign */
            uniqueEventType.map((type) => {
              let obj = {};
              const typeWiseEventRows = _.filter(courseWiseEvents, { eventType: type.event_type });
              let nextevents = typeWiseEventRows.filter(
                (event) => (startTime >= event.startDateTime && startTime <= event.endDateTime),
              );
              if (nextevents.length === 0) {
                nextevents = typeWiseEventRows.filter(
                  (event) => (event.startDateTime > startTime),
                );
              }
              obj = {
                type: type.event_type,
                total_event: typeWiseEventRows.length,
                next_event: ((nextevents.length > 0)) ? nextevents[0].startDateTime : '',
                room_name: ((nextevents.length > 0)) ? nextevents[0].roomName : '',
                next_event_id: ((nextevents.length > 0)) ? nextevents[0].id : '',
              };
              course.event_type.push(obj);
              return course;
            });
            return course;
          }));
          resolve(eventSummary);
        }
        resolve({ message: 'No event found' });
      })
      .catch((error) => {
        reject(error, 404);
      });
  });
};

module.exports = {
  addEvent,
  changeEventStatus,
  updateEvent,
  getEventbyId,
  getAllEventsAssignedToUser,
  deleteEvent,
  getAllEvents,
  attendanceResult,
  courseEvents,
  eventSumByPersonal,
};
