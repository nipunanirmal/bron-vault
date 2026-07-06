import type { FilterSettings } from "@/lib/settings"

/**
 * Extract hostname from a URL string.
 * Handles http://, https://, and protocol-less URLs.
 */
function getHostname(url: string): string {
  try {
    let clean = url.trim()
    if (clean.startsWith("http://")) clean = clean.slice(7)
    else if (clean.startsWith("https://")) clean = clean.slice(8)
    clean = clean.replace(/^www\./, "")
    return clean.split("/")[0].split(":")[0].toLowerCase()
  } catch {
    return ""
  }
}

/**
 * Check if a URL matches any junk prefix (e.g. android://).
 */
function isJunkPrefix(url: string, prefixes: string[]): boolean {
  const lower = url.toLowerCase()
  return prefixes.some((p) => lower.startsWith(p))
}

/**
 * Check if a URL's hostname is in the junk hosts list or matches junk host prefixes.
 */
function isJunkHost(url: string, hosts: string[], hostPrefixes: string[]): boolean {
  const hostname = getHostname(url)
  if (!hostname) return false
  if (hosts.includes(hostname)) return true
  return hostPrefixes.some((p) => hostname.startsWith(p))
}

/**
 * Check if a username contains any junk substring (e.g. t.me, telegram).
 */
function isJunkUsername(username: string, substrings: string[]): boolean {
  const lower = username.toLowerCase()
  return substrings.some((s) => lower.includes(s))
}

/**
 * Check if a URL's domain is in the skip list or doesn't match the domain filter.
 */
function isDomainFiltered(url: string, skipDomains: string[], domainFilter: string): boolean {
  const hostname = getHostname(url)
  if (!hostname) return false

  // Check skip domains (exact match or subdomain match)
  if (skipDomains.length > 0) {
    const lowerHostname = hostname.toLowerCase()
    if (skipDomains.some((skip) => lowerHostname === skip || lowerHostname.endsWith("." + skip))) {
      return true
    }
  }

  // Check domain TLD filter (e.g. ".lk" — only allow matching domains)
  if (domainFilter) {
    if (!hostname.toLowerCase().endsWith(domainFilter)) {
      return true
    }
  }

  return false
}

export interface FilterResult {
  skip: boolean
  reason: string
}

/**
 * Check whether a credential should be skipped based on filter settings.
 * Returns { skip: true, reason } if the credential should be filtered out.
 */
export function shouldSkipCredential(
  url: string,
  username: string,
  filters: FilterSettings,
): FilterResult {
  // Check junk URL prefixes
  if (isJunkPrefix(url, filters.junkPrefixes)) {
    return { skip: true, reason: "junk_prefix" }
  }

  // Check junk hosts
  if (isJunkHost(url, filters.junkHosts, filters.junkHostPrefixes)) {
    return { skip: true, reason: "junk_host" }
  }

  // Check junk username substrings
  if (isJunkUsername(username, filters.junkUsernameSubstrings)) {
    return { skip: true, reason: "junk_username" }
  }

  // Check domain skip list and TLD filter
  if (isDomainFiltered(url, filters.skipDomains, filters.domainFilter)) {
    return { skip: true, reason: "domain_filtered" }
  }

  return { skip: false, reason: "" }
}
