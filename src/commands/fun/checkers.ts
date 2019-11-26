// 12x red pieces, 12x black pieces,
// 1x selected red piece, selected black piece
// full white square, full dark square,
// edge pieces
// arrow pieces
// move by
//: selecting a piece (with its number)
// the board will highlight that piece and
//    and the directions it can move
// then select a direction
// you can also reselect a piece instead of
//    selecting a direction
// jumping is the same. when you select the
//    piece, it highlights what it can jump past
//    but after you choose to jump, you have to
//    select another direction again (can't select)
//    (a different piece)

// game is played left to right. black on left, red on right

// two messages. top is board and piece selection, bottom is
//    direction selection. on your turn, it will @ you in
//    piece selection, then both piece and direction. if
//    you can only go in direction, it will only @ you in
//    direction (so the message highlight shows what you)
//    (can do.)

// two player game. have the joining thing anyway because
//    I think it's easier to use and more clear. Redo it
//    into a reusable function to use in this and connect4.
//    ejyptian war will need its own because the owner chooses
//    when to start the game.