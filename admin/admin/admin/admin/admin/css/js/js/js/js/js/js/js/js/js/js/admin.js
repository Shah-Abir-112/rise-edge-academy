console.log("Rise Edge Academy Admin System Loaded");

const teachersList = document.getElementById("teachersList");
const studentsList = document.getElementById("studentsList");

if (teachersList) {
  teachersList.textContent = "No teachers loaded yet.";
}

if (studentsList) {
  studentsList.textContent = "No students loaded yet.";
}
