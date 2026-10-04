console.log("Rise Edge Academy Notices System Loaded");

const noticeForm = document.getElementById("noticeForm");

if (noticeForm) {
  noticeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = document.getElementById("noticeTitle").value;
    const text = document.getElementById("noticeText").value;
    const message = document.getElementById("noticeMessage");

    if (message) {
      message.textContent =
        "Notice saved locally. Firebase will be connected later.";
    }

    console.log("Notice:", title, text);
  });
}
