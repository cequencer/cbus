*************
CNI Discovery
*************

At the moment this is a rather unorganised set of notes while I'm still figuring out the protocol.

I've started working on a test program for dissecting the protcol in ``cbus/discovery_test.py``.

Discovery Query
===============

A client will broadcast a UDP packet on 255.255.255.255:20050.

Data structure is as follows::

	char[4] command  = "CB 80 00 00"  // CBUS_DISCOVERY_QUERY
	char[4] unknown1 = "00 00 00 00"
	char[4] unknown2 = "01 01 01 0B"
	char[4] unknown3 = "01 1D 80 01"
	char[3] unknown4 = "02 47 FF"

Example packet::

	cb:80:00:00:00:00:00:00:01:01:01:0b:01:1d:80:01:02:47:ff
	
	0xcb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x01, 0x01, 0x01, 0x0b, 0x01, 0x1d, 0x80, 0x01, 
	0x02, 0x47, 0xff


Discovery Reply
===============

Replies are sent back to the querying client on port 20050.

Values are in big-endian format (network byte order)::

	char[4]  magic      = 0xcb, 0x81, 0x00, 0x00   CBUS_DISCOVERY_REPLY
	char[4]  unknown1   = 0x00, 0x00, 0x00, 0x01   //  0x20, 0xe8, 0xf5, 0x52
	char[4]  unknown2   = 0x81, 0x01, 0x00, 0x01
	char     product_id = 0x03 // 0x01
	char[4]  unknown4   = 0x81, 0x0b, 0x00, 0x02
	uint16   port       = 0x27, 0x11  (10001)
	char[4]  unknown5   = 0x81, 0x1d, 0x00, 0x01
	char     unknown6   = 0x00 // 0x01     (not a flag for "in use")
	char[4]  unknown7   = 0x80, 0x01, 0x00, 0x02
	char[2]  unknown8   = 0x66, 0x1e // 0x8c, 0x26  (may be a checksum, but doesn't appear to be used)

Product IDs:
	
* ``01``: CNI2
* ``02``: Hidden -- Toolkit ignores packets with this product ID.  May be used for internal development.
* ``03``: WISER
* Other values: "unknown"
	
Example packet data::

	Recv

	Client 1 (172.26.1.81)
	CNI2 port 10001, "not accessible" (controlled by a WISER)

	0xcb, 0x81, 0x00, 0x00, 0x20, 0xe8, 0xf5, 0x52, 
	0x81, 0x01, 0x00, 0x01, 0x01, 0x81, 0x0b, 0x00, 
	0x02, 0x27, 0x11, 0x81, 0x1d, 0x00, 0x01, 0x01, 
	0x80, 0x01, 0x00, 0x02, 0x8c, 0x26 

	Client 2 (172.26.1.80)
	WISER port 10001

	0xcb, 0x81, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 
	0x81, 0x01, 0x00, 0x01, 0x03, 0x81, 0x0b, 0x00, 
	0x02, 0x27, 0x11, 0x81, 0x1d, 0x00, 0x01, 0x00, 
	0x80, 0x01, 0x00, 0x02, 0x66, 0x1e

	b = "\xcb\x81\x00\x00\x00\x00\x00\x01\x81\x01\x00\x01\x03\x81\x0b\x00\x02'\x11\x81\x1d\x00\x01\x00\x80\x01\x00\x02f" + '\x1e'
