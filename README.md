# chat-js-project2

This is a training project, chat app on vanilla JS with simple Node.js backend.
To see how it works just download the repository, make "npm install" and run "node server/server.js" from root dir.

This will start the socket server on port 8080 and web server on 8000 (you'll see console message about it).

Then, go to localhost:8000, enter a nickname and go messaging )
You can enter to the chat from several browser tabs with different nicknames, and see how socket-messaging works: 
  own messages has different visual style, also you can upload avatar (by click the settings button on the top-left corner), and this avatar will shown for all participants, 
  and it is some system messages if new user logged in or log out. Page updating doesn't broke current state, user data is stored on the Session Storage for sipmlicity.
