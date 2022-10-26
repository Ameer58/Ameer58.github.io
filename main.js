// JavaScript source code
function greeting() {
    window.alert('Good morning!')
    document.getElementById("greeting").innerHTML = "Oh and incase I don't see ya"
    console.log("Good afternoon, good evening and good night")
}

function changeText() {

    let para = document.getElementById("new para")

    if (para) {
        para.remove()
    }
    else {
        para = document.createElement("p")
        para.id = "new para"
        let textNode = document.createTextNode(`With ${actor.getFullName()} as ${characters[0]}`)
        para.appendChild(textNode)
        document.getElementById("title-container").appendChild(para)
    }
}

var title = "Wawawa"
let dirctor = "Wawa"
const releaseYear = 1993

const characters = []
characters.push("W A")
const actor = {}

actor.Name = "K"
actor.LastName = "P"
actor.getFullName = function () {
    return this.Name + " " + this.LastName
}

const actress = {
    Name: "Laura",
    LastName: "Limney",
    getFullName() {
        return this.Name + " " + this.LastName
    }
}