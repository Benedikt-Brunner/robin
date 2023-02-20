// TODO: Rename the concept of a player to the concept of a name, because
//	that is really what this is: a string table, i.e. a mapping of name-ids to name-strings.
//	A player is more than a name. A player has e.g. a rating and a sequence of matches.

import { scoreToString } from "./tools.js";

const madd = (d, w, b, i) => {
	if (!(w in d)) d[w] = {};
	d[w][b] = i;
};

export class MatchInfo
{
	constructor(m)
	{
		this.set(m)
	}

	set(m)
	{
		this.m = m;
		this[0] = m[0];
		this[1] = m[1];
		this[2] = m[2];
		this.w = m[0];
		this.b = m[1];
		this.ws = m[2] === null ? "" : scoreToString(m[2], true);
		this.bs = m[2] === null ? "" : scoreToString(1 - m[2], true);
		this.wr = m[2] === null ? "" : scoreToString(m[2], false);
		this.br = m[2] === null ? "" : scoreToString(1 - m[2], false);
	}

	toggleResult(forward = true) {
		const m = this.m;
		if (m[2] === null) m[2] = forward ? 1 : 0;
		else if (m[2] === 1) m[2] = forward ? 0.5 : null;
		else if (m[2] === 0.5) m[2] = forward ? 0 : 1;
		else if (m[2] === 0) m[2] = forward ? null : 0.5;
		return this;
	}

	swapColors()
	{
		const m = this.m;
		[ m[0], m[1] ] = [ m[1], m[0] ];
		this.set(m);
		return this;
	}
}

export class Matches
{
	constructor(json)
	{
		this.dropouts = [];
		
		this.pa = [];
		this.pd = {};
		this.setPlayers(json.players);
		
		this.ma = [];
		this.md = {};
		this.setMatches(json.matches);
	}

	setPlayers(players)
	{
		this.pa = players;	// players array
		this.pd = [];		// players dict
		for (let i = 0; i < this.pa.length; ++i)
		{
			// TODO: Maybe just renormalize? Assign consecutive
			//	integers 1, 2, ... as pids ? Checking for pid inclusion
			//	could be done with ranges rather than with find().
			const p = this.pa[i];
			this.pd[p[0]] = p[1];
		}
	}

	setMatches(matches)
	{
		this.ma = matches;
		this.md = {};
		for (let i = 0; i < this.ma.length; ++i)
		{
			const m = this.ma[i];
			madd(this.md, m[0], m[1], i);
			madd(this.md, m[1], m[0], i);
		}
	}

	get count() { throw new Error("deprecated: use playerCount"); }

	get playerCount() { return this.pa.length; }

	get activePlayerCount() { return this.pa.length - this.dropouts.length; }

	get matchesCount() { return this.ma.length; }

	clearMatches()
	{
		this.ma = [];
		this.md = {};
	}

	hasMatch(p1, p2)
	{
		throw new Error("Not implemented yet.");
	}

	addMatch(p1, p2, r = null)
	{
		let i = this.getMatchIndex(p1, p2);
		if (i === null)
		{
			i = this.ma.length;
			this.ma[i] = null;
			madd(this.md, p1, p2, i);
			madd(this.md, p2, p1, i);
		}
		this.ma[i] = [p1, p2, r];
		return i;
	}

	removeMatch(p1, p2)
	{
		throw new Error("Not implemented yet.");
	}

	ensureMatchExists(p1, p2)
	{
		const i = this.getMatchIndex(p1, p2);
		if (i === null || this.ma[i][2] == null && this.ma[i][0] != p1)
			return this.addMatch(p1, p2, null);
		return i;
	}

	getNonDropoutMatches()
	{
		throw new Error("Not implemented yet.");
	}

	getMatchesForPlayer(pid)
	{
		const xx = [];
		for (let i = 0; i < this.ma.length; ++i)
		{
			const m = this.ma[i];
			if (m[0] == pid || m[1] == pid)
				xx.push(m);
		}
		return xx;
	}

	getTotalPointsForPlayer(pid)
	{
		let p = 0;
		for (let i = 0; i < this.ma.length; ++i)
		{
			const m = this.ma[i];
			if (m[2] !== 0 && m[2] !== 0.5 && m[2] !== 1) continue;
			if (m[0] == pid && !this.isDropout(m[1])) p += m[2];
			else if (m[1] == pid && !this.isDropout(m[0])) p += (1 - m[2]);
		}
		return p;
	}

	getTotalPointsArray()
	{
		// TODO: Optimize it by reducing to a single loop?
		const tpa = [];
		for (let pid in this.pd)
		{
			pid = parseInt(pid);
			tpa.push([
				pid,
				this.pd[pid],
				this.getTotalPointsForPlayer(pid),
			]);
		}
		return tpa;
	}

	isDropout(pid) { return this.dropouts.indexOf(pid) >= 0; }

	addDropout(pid)
	{
		throw new Error("Not implemented yet.");
	}

	removeDropout(pid)
	{
		throw new Error("Not implemented yet.");
	}
	
	toggleDropout(pid)
	{
		const index = this.dropouts.indexOf(pid);
		if (index < 0) this.dropouts.push(pid);
		else delete this.dropouts[index];
		return index < 0;
	}
	
	isPid(pid)
	{
		// FIXME: Reindex the the player pids so that they
		//	can be range-checked rather than looped through.
		// 	E.g.: return pid >= 1 && pid < this.playerCount;
		//	If we need the original pids (as passed us from the
		//	server, then store them somewhere).
		
		pid = parseInt(pid);
		return Object.keys(this.pd).some(key => { return key == pid });
	}

	getMatchIndex(p1, p2)
	{
		if (!this.isPid(p1) || !this.isPid(p2)) return null;
		// TODO: If we changed all nulls to undefineds, we could do just this:
		//	return this.md[p1] && this.md[p1][p2];
		if (!(p1 in this.md)) return null;
		if (!(p2 in this.md[p1])) return null;
		return this.md[p1][p2];
	}

	getMatchByIndex(i)
	{
		return i === null ? null : this.ma[i];
	}

	getMatch(p1, p2)
	{
		const i = this.getMatchIndex(p1, p2);
		return this.getMatchByIndex(i);
	}

	getMatchInfo(p1, p2)
	{
		const i = this.getMatchIndex(p1, p2);
		return this.getMatchInfoByIndex(i);
	}

	getMatchInfoByIndex(i)
	{
		const m = this.getMatchByIndex(i);
		if (m === null || m === undefined) return null;
		return new MatchInfo(m);
	}
}