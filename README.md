# Data API
This is an open source API that serves (mostly) open data for schools in a standardized format that is easy to understand and interact with. The purpose of the API is to enable students and others to create new solutions to help make the work both students and employees do at schools and other orginisations.

## About
The project originates from an old mobile app for a specific school (IT-Gymnasiet Göteborg) that I built and facilitated in my high school years. That app eventually had the need of a public API to serve data in a format that was easy to use in the app itself, allowing me to also update the data on demand without pushing an app update.

This API, however, is very different, and is designed from the ground up to be an open solution for students and people who want to build new cool solutions with the school data it provides. Right now it connects to a few schedule systems and makes that data available in a standardized format that is easy to understand and interact with. But in the future I hope to integrate and add more data points that can help make systems and solutions better for schools and organisations.

The concept is overall the same for the systems with few exceptions, but the process itself for each system is very different. Both systems are being facilitated by the same company, where Novaschem is the legacy system, and Skola24 the more "modern" take using practically the same data.

Both systems have a list of schedules for each school with a specific type associated to it. The types are according to order: teachers, classes, groups, students, rooms, subjects, courses and aulas. The schedules are all stored in the database for easier and fast query, but the actual schedule data (lessons) are all fetched and parsed on demand.

#### Novaschem
To parse schedule data from Novaschem the API uses the print functionality to parse the PDF output and map out each lesson from the fill elements. And then within each fill element, there are a group of text elements that are thereby associated with the fill element and with that the lesson itself.

The data is then parsed and matched against the list of schedules in Noveschem, for example teachers, classrooms and classes. Finally the [open data from Skolverket](https://skolverket.gradee.io) is used to help determine the correct lesson title by matching the texts to course titles.

The PDFs are also stored locally on the server as a form of cache to more quickly serve the data instead of going directly to Novaschem.

#### Skola24
This system actually has a form of "open API" (open as in allows request from any origin), but it lacks public documentation. But thankfully it exists, which makes this process a lot easier.

However, the data that is served from the API when loading schedule data is not in a information friendly format. The format is instead most likely for the engine that they use to draw out the schedule, which is very similar to PDF. This did make it easier though since the format was so similar to the data output for the PDF's from Novaschem (coincidence..?). 

And so it is parsed in a very similar manner, and uses the data from the schedule lists as well to determine the classes, classrooms and such associated with the lesson and so on. However we do not use Skolverket here yet, since it's quite a lot easier to determine the lesson title with this data. And some schools actually have the courses available in the "API", making it easy to determine the course in the lesson, and thereby the lesson title.

## Setup
Work in progress.. 👨‍💻


## License
[MIT](LICENSE) © [Max Sandelin](https://github.com/themaxsandelin)
