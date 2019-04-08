--
-- File generated with SQLiteStudio v3.1.1 on sön apr 7 20:41:55 2019
--
-- Text encoding used: System
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- Table: node
CREATE TABLE node (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
);


-- Table: scene
CREATE TABLE scene (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL
);


-- Table: scene_value
CREATE TABLE scene_value (
    id       INTEGER PRIMARY KEY AUTOINCREMENT
                     NOT NULL,
    scene_id INTEGER REFERENCES scene (id) ON DELETE CASCADE
                     NOT NULL,
    node_id  INTEGER NOT NULL
                     REFERENCES node (id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL,
    instance INTEGER NOT NULL,
    [index]  INTEGER NOT NULL,
    value    INTEGER NOT NULL
);


-- Table: timer
CREATE TABLE timer (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id INTEGER REFERENCES scene (id) ON DELETE CASCADE,
    name     TEXT    NOT NULL,
    hour     INTEGER,
    minute   INTEGER
);


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
