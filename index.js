import { get as getEmoji } from 'node-emoji';
import { emoticon as emotiorig } from 'emoticon';
import { findAndReplace } from 'mdast-util-find-and-replace';
const RE_EMOJI = /:\+1:|:-1:|:[\w-]+:/g;
const RE_SHORT = /(^|\s)[@$|*'",;.=:\-)([\]\\/<>038BOopPsSdDxXzZ]{2,5}/g;
const RE_PUNCT = /(?:_|-(?!1))/g;
const DEFAULT_SETTINGS = {
	padSpaceAfter: false,
	emoticon: false,
	accessible: false
};
const plugin = (options) => {
	const settings = Object.assign({}, DEFAULT_SETTINGS, options);
	const pad = !!settings.padSpaceAfter;
	const emoticonEnable = !!settings.emoticon;
	const accessible = !!settings.accessible;
	function aria(text, label) {
		// Creating HTML node in Markdown node is undocumented.
		// https://github.com/syntax-tree/mdast-util-math/blob/e70bb824dc70f5423324b31b0b68581cf6698fe8/index.js#L44-L55
		return {
			type: 'text',
			value: text,
			data: {
				hName: 'span',
				hProperties: {
					role: 'img',
					ariaLabel: label
				},
				hChildren: [{ type: 'text', value: text }]
			}
		};
	}
	function replaceEmoticon(match) {
		const emoticon = emotiorig.map((e) => {
			if (e.name == 'confused') {
				e.emoticons = [': -\\', '=-/'];
			}
			return e;
		});
		// find emoji by shortcode - full match or with-out last char as it could be from text e.g. :-),
		const iconFull = emoticon.find((e) => e.emoticons.includes(match)); // full match
		const iconPartStart = emoticon.find((e) =>
			e.emoticons.includes(match.slice(0, -1))
		); // second search pattern
		const iconPartEnd = emoticon.find((e) =>
			e.emoticons.includes(match.slice(1))
		);
		const iconPart = emoticon.find((e) =>
			e.emoticons.includes(match.slice(1, -1))
		);
		const icon = iconFull || iconPartStart || iconPartEnd || iconPart;
		if (!icon) {
			return false;
		}
		const trimmedChar =
			!(iconFull || iconPartEnd) && (iconPart || iconPartStart)
				? match.slice(-1)
				: '';
		const startTrimmedChar =
			!(iconFull || iconPartStart) && (iconPart || iconPartEnd)
				? match.slice(0, 1)
				: '';
		const addPad = pad ? ' ' : '';
		const replaced = startTrimmedChar + icon.emoji + addPad + trimmedChar;
		if (accessible) {
			return aria(replaced, icon.name + ' emoticon');
		}
		return replaced;
	}
	function replaceEmoji(match) {
		let got = getEmoji(match);
		if (typeof got === 'undefined') {
			return false;
		}
		if (pad) {
			got = got + ' ';
		}
		if (accessible) {
			const label = match.slice(1, -1).replace(RE_PUNCT, ' ') + ' emoji';
			return aria(got, label);
		}
		return got;
	}
	const replacers = [[RE_EMOJI, replaceEmoji]];
	if (emoticonEnable) {
		replacers.push([RE_SHORT, replaceEmoticon]);
	}
	function transformer(tree) {
		findAndReplace(tree, replacers);
	}
	return transformer;
};

export default plugin;
