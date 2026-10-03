import type { MovieCreateInput } from "@/types/movie";

export const SEED_MOVIES: MovieCreateInput[] = [
  {
    title: "Inception",
    director: "Christopher Nolan",
    year: 2010,
    genre: "Sci-Fi",
    rating: 8.8,
    watched: true,
    description: "A thief enters dreams to steal and plant ideas."
  },
  {
    title: "The Matrix",
    director: "Lana Wachowski, Lilly Wachowski",
    year: 1999,
    genre: "Action",
    rating: 8.7,
    watched: true,
    description: "A hacker discovers the world is a simulated reality."
  },
  {
    title: "Spirited Away",
    director: "Hayao Miyazaki",
    year: 2001,
    genre: "Animation",
    rating: 8.6,
    watched: false,
    description: "A young girl navigates a mysterious spirit world."
  },
  {
    title: "Parasite",
    director: "Bong Joon-ho",
    year: 2019,
    genre: "Thriller",
    rating: 8.5,
    watched: true,
    description: "Two families become entangled across class lines."
  },
  {
    title: "The Grand Budapest Hotel",
    director: "Wes Anderson",
    year: 2014,
    genre: "Comedy",
    rating: 8.1,
    watched: false,
    description: "A concierge and lobby boy become wrapped in a caper."
  },
  {
    title: "Mad Max: Fury Road",
    director: "George Miller",
    year: 2015,
    genre: "Adventure",
    rating: 8.1,
    watched: true,
    description: "A high-speed chase across a post-apocalyptic wasteland."
  },
  {
    title: "Get Out",
    director: "Jordan Peele",
    year: 2017,
    genre: "Horror",
    rating: 7.8,
    watched: false,
    description: "A weekend visit reveals a terrifying secret."
  },
  {
    title: "The Godfather",
    director: "Francis Ford Coppola",
    year: 1972,
    genre: "Crime",
    rating: 9.2,
    watched: true,
    description: "The aging patriarch of a crime dynasty transfers control."
  },
  {
    title: "Amelie",
    director: "Jean-Pierre Jeunet",
    year: 2001,
    genre: "Romance",
    rating: 8.3,
    watched: false,
    description: "A shy waitress decides to improve the lives around her."
  },
  {
    title: "Free Solo",
    director: "Elizabeth Chai Vasarhelyi, Jimmy Chin",
    year: 2018,
    genre: "Documentary",
    rating: 8.1,
    watched: true,
    description: "A climber prepares to scale El Capitan without ropes."
  }
];
