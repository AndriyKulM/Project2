import os

from flask import Flask, render_template, redirect, url_for
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Створюємо список каналів, список юзерів онлайн і список із словників (ключами в яких будуть назви каналів, а
# значеннями - списки повідомлень в цих каналах).
# По замовчуванню встановимо канал first з пустим списком повідомлень в ньому.
channel_list = ["first"]
online_list = []
messages = {"first": []}


# Перенаправляємо юзера на канал по замовчуванню, тобто first, на URL:  http://127.0.0.1:5000/c/first
@app.route("/")
def index():
    return redirect(url_for("channel", name="first"))


# При створенні каналу перевіряємо, чи немає цього каналу вже у списку, і рендеримо сторінку для нього
@app.route("/c/<string:name>")
def channel(name):
    if name not in channel_list:
        print("Channel is not exist")

    return render_template("channel.html", online_list=online_list, channel_list=channel_list, messages=messages[name],
                           current_channel=name)


# При додаванні юзера перевіряємо, чи немає його в списку онлайн. Якщо немає - то додаємо до списку і підраховуємо
# кількість юзерів. Відсилаємо ці дані у функцію *announce online* для відображення на сайті юзера як доступного
# для чату.
@socketio.on("add user")
def add_user(data):
    if data["display_name"] not in online_list:
        online_list.append(data["display_name"])
        emit("announce online", {"online": len(online_list), "display_name": data["display_name"], "event": "add"}, broadcast=True)
    print(data["display_name"] + " is exist!")


# При додаванні каналу перевіряємо, чи немає його в списку каналів. Якщо немає - то додаємо до списку. В список
# словників з повідомленнями встановлюємо значення по замовчуванню, тобто назву каналу і пустий список повідомлень.
# Відсилаємо ці дані у функцію *announce channel* для відображення на сайті цього каналу в списку доступних.
@socketio.on("add channel")
def add_a_channel(data):
    if data["channel"] not in channel_list:
        channel_list.append(data["channel"])
        messages.setdefault(data["channel"], [])
        emit("announce channel", {"channel": data["channel"]}, broadcast=True)
    return redirect(url_for("channel", name=data["channel"]))


# При додаванні повідомлення, додаємо його до списку словників з повідомленнями messages з такими даними:
# назва юзера, час створення повідомлення і текст повідомлення. Якщо кількість повідомлень більша, ніж 100шт.,
# то знищуємо перше повідомлення із списку. Пересилаємо ці дані у функцію *awarding message*
# для відображення повідомлення на сайті.
@socketio.on("add message")
def message_is(data):
    messages[data["channel"]].append((data["user"], data["time_msg"], data["message"]))

    while len(messages[data["channel"]]) > 100:
        messages[data["channel"]].pop(0)

    emit("awarding message", {"user": data["user"], "time_msg": data["time_msg"], "message": data["message"], "channel": data["channel"]}, broadcast=True)