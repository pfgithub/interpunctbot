/*

!!!! note that when the bot requires sharding, the bot will not be able to dm people and edit the
message in the server at the same time. when a game starts, the start  event needs to
get sent to shard 0 and shard 0 will handle the game.

game crazy 8s

---

let game = new GameSpec();

let players = game.players("2..");
let draw = game.pile("draw")
let discard = game.pile("discard")

players.each(

)


---

getplayers 2.. -> players

pile draw
visible back draw players
pile discard
visible front discard players
appearence toponly discard
each player in players:
	pile %player.hand
	visible front %player.hand %player
	visible back %player.hand [players - %player.hand]

each card in standard_playing_cards:
	add card -> draw

shuffle draw

define draw.take
	get top from draw -> topcard
	if topcard exists
		take top from draw -> return
	else
		each card from discard:
			take card from discard
			add card to draw
		shuffle draw

each player in players:
	card = draw.take
	add card -> %player.hand

player turn = first player

define get.playable

until [
	done = false
	each player in players
		if %player.hand empty
			done = true
			set winner player
	done
]
	set inputs [
		get.playable turn
		input from turn [playable] named card
	]
	results = wait inputs
	turn = player.after(turn)

announce winner player

-----

simpler definition:
piles draw, discard
players have a hand

setup:
draw one card and discard it

each turn:
play a playable card
if 8, choose a suit

*/
