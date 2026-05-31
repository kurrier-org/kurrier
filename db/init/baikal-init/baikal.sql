--
-- PostgreSQL database dump
--

\restrict iqOs53rLlKvbqrDC14pukD6ZIjPlA06fE7LfAzNyJpNAHuDhWlnaXeDYdCDsw2F

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addressbookchanges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addressbookchanges (
    id integer NOT NULL,
    uri text NOT NULL,
    synctoken integer NOT NULL,
    addressbookid integer NOT NULL,
    operation smallint NOT NULL,
    CONSTRAINT addressbookchanges_addressbookid_check CHECK ((addressbookid > 0)),
    CONSTRAINT addressbookchanges_synctoken_check CHECK ((synctoken > 0))
);


--
-- Name: addressbookchanges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addressbookchanges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addressbookchanges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addressbookchanges_id_seq OWNED BY public.addressbookchanges.id;


--
-- Name: addressbooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addressbooks (
    id integer NOT NULL,
    principaluri text,
    displayname character varying(255),
    uri text,
    description text,
    synctoken integer DEFAULT 1 NOT NULL,
    CONSTRAINT addressbooks_synctoken_check CHECK ((synctoken > 0))
);


--
-- Name: addressbooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addressbooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addressbooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addressbooks_id_seq OWNED BY public.addressbooks.id;


--
-- Name: calendarchanges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendarchanges (
    id integer NOT NULL,
    uri text NOT NULL,
    synctoken integer NOT NULL,
    calendarid integer NOT NULL,
    operation smallint NOT NULL,
    CONSTRAINT calendarchanges_calendarid_check CHECK ((calendarid > 0)),
    CONSTRAINT calendarchanges_synctoken_check CHECK ((synctoken > 0))
);


--
-- Name: calendarchanges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendarchanges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendarchanges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendarchanges_id_seq OWNED BY public.calendarchanges.id;


--
-- Name: calendarinstances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendarinstances (
    id integer NOT NULL,
    calendarid integer NOT NULL,
    principaluri text,
    access smallint DEFAULT '1'::smallint NOT NULL,
    displayname character varying(100),
    uri text,
    description text,
    calendarorder integer DEFAULT 0 NOT NULL,
    calendarcolor text,
    timezone text,
    transparent smallint DEFAULT '0'::smallint NOT NULL,
    share_href text,
    share_displayname character varying(100),
    share_invitestatus smallint DEFAULT '2'::smallint NOT NULL,
    CONSTRAINT calendarinstances_calendarid_check CHECK ((calendarid > 0)),
    CONSTRAINT calendarinstances_calendarorder_check CHECK ((calendarorder >= 0))
);


--
-- Name: calendarinstances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendarinstances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendarinstances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendarinstances_id_seq OWNED BY public.calendarinstances.id;


--
-- Name: calendarobjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendarobjects (
    id integer NOT NULL,
    calendardata text,
    uri text,
    calendarid integer NOT NULL,
    lastmodified integer,
    etag text,
    size integer NOT NULL,
    componenttype text,
    firstoccurence integer,
    lastoccurence integer,
    uid text,
    CONSTRAINT calendarobjects_calendarid_check CHECK ((calendarid > 0)),
    CONSTRAINT calendarobjects_firstoccurence_check CHECK ((firstoccurence > 0)),
    CONSTRAINT calendarobjects_lastmodified_check CHECK ((lastmodified > 0)),
    CONSTRAINT calendarobjects_lastoccurence_check CHECK ((lastoccurence > 0)),
    CONSTRAINT calendarobjects_size_check CHECK ((size > 0))
);


--
-- Name: calendarobjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendarobjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendarobjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendarobjects_id_seq OWNED BY public.calendarobjects.id;


--
-- Name: calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendars (
    id integer NOT NULL,
    synctoken integer DEFAULT 1 NOT NULL,
    components text,
    CONSTRAINT calendars_synctoken_check CHECK ((synctoken > 0))
);


--
-- Name: calendars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendars_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendars_id_seq OWNED BY public.calendars.id;


--
-- Name: calendarsubscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendarsubscriptions (
    id integer NOT NULL,
    uri text NOT NULL,
    principaluri text NOT NULL,
    source text,
    displayname character varying(100),
    refreshrate character varying(10),
    calendarorder integer DEFAULT 0 NOT NULL,
    calendarcolor text,
    striptodos smallint,
    stripalarms smallint,
    stripattachments smallint,
    lastmodified integer,
    CONSTRAINT calendarsubscriptions_calendarorder_check CHECK ((calendarorder >= 0)),
    CONSTRAINT calendarsubscriptions_lastmodified_check CHECK ((lastmodified > 0))
);


--
-- Name: calendarsubscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendarsubscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendarsubscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendarsubscriptions_id_seq OWNED BY public.calendarsubscriptions.id;


--
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cards (
    id integer NOT NULL,
    addressbookid integer NOT NULL,
    carddata text,
    uri text,
    lastmodified integer,
    etag text,
    size integer NOT NULL,
    CONSTRAINT cards_addressbookid_check CHECK ((addressbookid > 0)),
    CONSTRAINT cards_lastmodified_check CHECK ((lastmodified > 0)),
    CONSTRAINT cards_size_check CHECK ((size > 0))
);


--
-- Name: cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cards_id_seq OWNED BY public.cards.id;


--
-- Name: groupmembers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groupmembers (
    id integer NOT NULL,
    principal_id integer NOT NULL,
    member_id integer NOT NULL,
    CONSTRAINT groupmembers_member_id_check CHECK ((member_id > 0)),
    CONSTRAINT groupmembers_principal_id_check CHECK ((principal_id > 0))
);


--
-- Name: groupmembers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groupmembers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groupmembers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groupmembers_id_seq OWNED BY public.groupmembers.id;


--
-- Name: locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locks (
    id integer NOT NULL,
    owner character varying(100),
    timeout integer,
    created integer,
    token text,
    scope smallint,
    depth smallint,
    uri text,
    CONSTRAINT locks_timeout_check CHECK ((timeout > 0))
);


--
-- Name: locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locks_id_seq OWNED BY public.locks.id;


--
-- Name: principals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.principals (
    id integer NOT NULL,
    uri text NOT NULL,
    email text,
    displayname character varying(80)
);


--
-- Name: principals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.principals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: principals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.principals_id_seq OWNED BY public.principals.id;


--
-- Name: propertystorage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.propertystorage (
    id integer NOT NULL,
    path text NOT NULL,
    name text NOT NULL,
    valuetype integer,
    value text,
    CONSTRAINT propertystorage_valuetype_check CHECK ((valuetype > 0))
);


--
-- Name: propertystorage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.propertystorage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: propertystorage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.propertystorage_id_seq OWNED BY public.propertystorage.id;


--
-- Name: schedulingobjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedulingobjects (
    id integer NOT NULL,
    principaluri text,
    calendardata text,
    uri text,
    lastmodified integer,
    etag text,
    size integer NOT NULL,
    CONSTRAINT schedulingobjects_lastmodified_check CHECK ((lastmodified > 0)),
    CONSTRAINT schedulingobjects_size_check CHECK ((size > 0))
);


--
-- Name: schedulingobjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedulingobjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedulingobjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedulingobjects_id_seq OWNED BY public.schedulingobjects.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text,
    digesta1 text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: addressbookchanges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addressbookchanges ALTER COLUMN id SET DEFAULT nextval('public.addressbookchanges_id_seq'::regclass);


--
-- Name: addressbooks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addressbooks ALTER COLUMN id SET DEFAULT nextval('public.addressbooks_id_seq'::regclass);


--
-- Name: calendarchanges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarchanges ALTER COLUMN id SET DEFAULT nextval('public.calendarchanges_id_seq'::regclass);


--
-- Name: calendarinstances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarinstances ALTER COLUMN id SET DEFAULT nextval('public.calendarinstances_id_seq'::regclass);


--
-- Name: calendarobjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarobjects ALTER COLUMN id SET DEFAULT nextval('public.calendarobjects_id_seq'::regclass);


--
-- Name: calendars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendars ALTER COLUMN id SET DEFAULT nextval('public.calendars_id_seq'::regclass);


--
-- Name: calendarsubscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarsubscriptions ALTER COLUMN id SET DEFAULT nextval('public.calendarsubscriptions_id_seq'::regclass);


--
-- Name: cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards ALTER COLUMN id SET DEFAULT nextval('public.cards_id_seq'::regclass);


--
-- Name: groupmembers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupmembers ALTER COLUMN id SET DEFAULT nextval('public.groupmembers_id_seq'::regclass);


--
-- Name: locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locks ALTER COLUMN id SET DEFAULT nextval('public.locks_id_seq'::regclass);


--
-- Name: principals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principals ALTER COLUMN id SET DEFAULT nextval('public.principals_id_seq'::regclass);


--
-- Name: propertystorage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propertystorage ALTER COLUMN id SET DEFAULT nextval('public.propertystorage_id_seq'::regclass);


--
-- Name: schedulingobjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedulingobjects ALTER COLUMN id SET DEFAULT nextval('public.schedulingobjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: addressbookchanges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addressbookchanges (id, uri, synctoken, addressbookid, operation) FROM stdin;
\.


--
-- Data for Name: addressbooks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addressbooks (id, principaluri, displayname, uri, description, synctoken) FROM stdin;
\.


--
-- Data for Name: calendarchanges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendarchanges (id, uri, synctoken, calendarid, operation) FROM stdin;
\.


--
-- Data for Name: calendarinstances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendarinstances (id, calendarid, principaluri, access, displayname, uri, description, calendarorder, calendarcolor, timezone, transparent, share_href, share_displayname, share_invitestatus) FROM stdin;
\.


--
-- Data for Name: calendarobjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendarobjects (id, calendardata, uri, calendarid, lastmodified, etag, size, componenttype, firstoccurence, lastoccurence, uid) FROM stdin;
\.


--
-- Data for Name: calendars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendars (id, synctoken, components) FROM stdin;
\.


--
-- Data for Name: calendarsubscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendarsubscriptions (id, uri, principaluri, source, displayname, refreshrate, calendarorder, calendarcolor, striptodos, stripalarms, stripattachments, lastmodified) FROM stdin;
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cards (id, addressbookid, carddata, uri, lastmodified, etag, size) FROM stdin;
\.


--
-- Data for Name: groupmembers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groupmembers (id, principal_id, member_id) FROM stdin;
\.


--
-- Data for Name: locks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.locks (id, owner, timeout, created, token, scope, depth, uri) FROM stdin;
\.


--
-- Data for Name: principals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.principals (id, uri, email, displayname) FROM stdin;
\.


--
-- Data for Name: propertystorage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.propertystorage (id, path, name, valuetype, value) FROM stdin;
\.


--
-- Data for Name: schedulingobjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedulingobjects (id, principaluri, calendardata, uri, lastmodified, etag, size) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, digesta1) FROM stdin;
\.


--
-- Name: addressbookchanges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.addressbookchanges_id_seq', 1, false);


--
-- Name: addressbooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.addressbooks_id_seq', 1, false);


--
-- Name: calendarchanges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendarchanges_id_seq', 1, false);


--
-- Name: calendarinstances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendarinstances_id_seq', 1, false);


--
-- Name: calendarobjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendarobjects_id_seq', 1, false);


--
-- Name: calendars_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendars_id_seq', 1, false);


--
-- Name: calendarsubscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendarsubscriptions_id_seq', 1, false);


--
-- Name: cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cards_id_seq', 1, false);


--
-- Name: groupmembers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.groupmembers_id_seq', 1, false);


--
-- Name: locks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.locks_id_seq', 1, false);


--
-- Name: principals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.principals_id_seq', 1, false);


--
-- Name: propertystorage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.propertystorage_id_seq', 1, false);


--
-- Name: schedulingobjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedulingobjects_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: addressbookchanges addressbookchanges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addressbookchanges
    ADD CONSTRAINT addressbookchanges_pkey PRIMARY KEY (id);


--
-- Name: addressbooks addressbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addressbooks
    ADD CONSTRAINT addressbooks_pkey PRIMARY KEY (id);


--
-- Name: calendarchanges calendarchanges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarchanges
    ADD CONSTRAINT calendarchanges_pkey PRIMARY KEY (id);


--
-- Name: calendarinstances calendarinstances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarinstances
    ADD CONSTRAINT calendarinstances_pkey PRIMARY KEY (id);


--
-- Name: calendarobjects calendarobjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarobjects
    ADD CONSTRAINT calendarobjects_pkey PRIMARY KEY (id);


--
-- Name: calendars calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendars
    ADD CONSTRAINT calendars_pkey PRIMARY KEY (id);


--
-- Name: calendarsubscriptions calendarsubscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarsubscriptions
    ADD CONSTRAINT calendarsubscriptions_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: groupmembers groupmembers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupmembers
    ADD CONSTRAINT groupmembers_pkey PRIMARY KEY (id);


--
-- Name: locks locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locks
    ADD CONSTRAINT locks_pkey PRIMARY KEY (id);


--
-- Name: principals principals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principals
    ADD CONSTRAINT principals_pkey PRIMARY KEY (id);


--
-- Name: propertystorage propertystorage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propertystorage
    ADD CONSTRAINT propertystorage_pkey PRIMARY KEY (id);


--
-- Name: schedulingobjects schedulingobjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedulingobjects
    ADD CONSTRAINT schedulingobjects_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: addressbookid_synctoken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addressbookid_synctoken ON public.addressbookchanges USING btree (addressbookid, synctoken);


--
-- Name: calendarid_synctoken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendarid_synctoken ON public.calendarchanges USING btree (calendarid, synctoken);


--
-- Name: locks_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locks_token_idx ON public.locks USING btree (token);


--
-- Name: locks_uri_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locks_uri_idx ON public.locks USING btree (uri);


--
-- Name: path_property; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX path_property ON public.propertystorage USING btree (path, name);


--
-- PostgreSQL database dump complete
--

\unrestrict iqOs53rLlKvbqrDC14pukD6ZIjPlA06fE7LfAzNyJpNAHuDhWlnaXeDYdCDsw2F

