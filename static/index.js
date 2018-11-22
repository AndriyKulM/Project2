    // У змінну current_channel, яка буде представляти поточний канал, запишемо строку після слеша (назву каналу)
    // https://stackoverflow.com/questions/39334400/how-to-split-url-to-get-url-path-in-javascript
    var current_channel = document.URL.split("/").pop();

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Коли web-сторінка завантажиться повністю
    document.addEventListener('DOMContentLoaded', () => {
        // Додаємо слухач подій для обробки події onclick при створенні нового каналу
        document.getElementById("create-channel-btn").addEventListener("click", () => {

            // Створимо змінну, в якій збережемо назву каналу, яку введе користувач в полі модального вікна
            var name_channel = prompt("Enter a name of channel:", "second");

            if (name_channel === "") {
            // user pressed OK, but the input field was empty
                alert("You pressed OK with empty field");
            } else if (name_channel) {
            // user typed something and hit OK
                socket.emit("add channel", {"channel": name_channel});
            } else {
            // user hit cancel
                alert("You hit Cancel");
            }
        });

        // Коли клієнт приєднався (законектився):
        socket.on("connect", () => {

            // Перевіримо, чи його display_name є у локальному сховищі localStorage, якщо немає -
            // то створимо змінну, в якій збережемо display_name, яке введе користувач в поле модального вікна
            if (localStorage.getItem("display_name") == null) {
                var display_name = prompt("Enter a display name: ");
                // Якщо user введе що-небудь
                localStorage.setItem("display_name", display_name);
            }

            // Додаємо display_name на web-сторінку
            document.querySelector("span#display_name_label").innerHTML = localStorage.getItem("display_name");

            // Додамо display_name користувача на сервер в список on-line користувачів, тобто доступних для чату
            socket.emit("add user", {
                "display_name": localStorage.getItem("display_name")
            });

            // Коли користувач натисне кнопку, то в змінній input_text збережемо текст повідомлення,
            // а в змінній time_msg - час створення повідомлення
            document.getElementById("send_btn").onclick = () => {
                let input_text = document.querySelector("input");
                let time_msg = new Date();

                // Відсилаємо повідомлення на сервер
                socket.emit("add message", {
                    "user": localStorage.getItem("display_name"),
                    "time_msg": time_msg.toLocaleString("uk-UA"),
                    "message": input_text.value,
                    "channel": current_channel
                });

                // Обнуляємо поле вводу
                input_text.value = "";
            };

            // Якщо користувач натисне кнопку Enter для вводу повідомлення, то обробимо цю подію так, як і при кліку
            // мишкою по кнопці (викличемо подію click)
            document.getElementById("input_msg").onkeyup = event => {
                if (event.keyCode == 13) {
                    document.getElementById("send_btn").click();
                }
            };
        });

        // Присвоюємо відіслане повідомлення поточному каналу
        socket.on("awarding message", data => {
            // Додаємо повідомлення тільки для поточного каналу
            if (data["channel"] === current_channel) {

                // Формуємо повідомлення (за допомогою елементів raw HTML). Для цього використаємо template literals
                // js variable.
                // Приклад: https://medium.com/front-end-hacking/es6-cool-stuffs-a-new-js-string-with-template-literals-c23a8af11b2
                let msg_view =`<article class="message">
                    <span class="user">${data["user"]}</span> <span class="time_msg">[${data["time_msg"]}]</span>
                    <p>${data["message"]}</p>
                    </article>`;
                document.querySelector("#msg_container").innerHTML += msg_view;

                // Коли ми прокрутимо сторінку (блок) з повідомленнями донизу
                var msg_to_top = document.querySelector("article");
                // Метод Element.scrollIntoView() прокручує поточний елемент у видиму область вікна браузера.
                msg_to_top[msg_to_top.length - 1].scrollIntoView(true);
            }
        });

        // Якщо змінилася кількість користувачів, які присутні в чаті, то відобразимо кількість юзерів:
        socket.on("announce online", data => {
            document.querySelector("#quantity_online").innerHTML = data["online"];

            // Якщо user щойно приєднався, додамо його до списку онлайн-користувачів
            if (data["event"] === "add") {
                let new_user = `<tr><td>${data["display_name"]}</td></tr>`;
                document.getElementById("online_table").innerHTML += new_user;
            }
        });

        // Після того, як добавлено новий канал - створити URL для нього і оновити список каналів
        socket.on("announce channel", data => {
            let link = "/c/" + data["channel"];
            let new_channel = `<tr><td># <a href="${link}">${data["channel"]}</a></td></tr>`;
            document.getElementById("channel_table").innerHTML += new_channel;
        });
    });