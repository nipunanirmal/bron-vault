"use client"

import { useState, useEffect } from "react"
import { Save, Info, Plus, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface FilterFormData {
  junkPrefixes: string
  junkHosts: string
  junkHostPrefixes: string
  junkUsernameSubstrings: string
  skipDomains: string[]
  domainFilter: string
}

const DEFAULT_FILTER_SETTINGS = {
  junkPrefixes: ["android://"],
  junkHosts: ["localhost", "127.0.0.1", "android"],
  junkHostPrefixes: [
    "192.168.", "10.",
    "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.",
    "172.24.", "172.25.", "172.26.", "172.27.",
    "172.28.", "172.29.", "172.30.", "172.31.",
  ],
  junkUsernameSubstrings: ["t.me", "telegram.me", "telegram"],
}

export function FilterConfigurationTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FilterFormData>({
    junkPrefixes: DEFAULT_FILTER_SETTINGS.junkPrefixes.join(", "),
    junkHosts: DEFAULT_FILTER_SETTINGS.junkHosts.join(", "),
    junkHostPrefixes: DEFAULT_FILTER_SETTINGS.junkHostPrefixes.join(", "),
    junkUsernameSubstrings: DEFAULT_FILTER_SETTINGS.junkUsernameSubstrings.join(", "),
    skipDomains: [],
    domainFilter: "",
  })
  const [newSkipDomain, setNewSkipDomain] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/settings?prefix=filter_")
      if (res.ok) {
        const data = await res.json()
        const settingsArray: Array<{ key_name: string; value: string }> = Array.isArray(data.settings)
          ? data.settings
          : []
        const settings = Object.fromEntries(settingsArray.map((item) => [item.key_name, item.value])) as Record<string, string>
        const getVal = (key: string): string => settings[key] || ""

        const parseList = (s: string, defaults: string[]): string => {
          const items = s.split(",").map((x: string) => x.trim()).filter(Boolean)
          return items.length > 0 ? items.join(", ") : defaults.join(", ")
        }

        setFormData({
          junkPrefixes: parseList(getVal("filter_junk_prefixes"), DEFAULT_FILTER_SETTINGS.junkPrefixes),
          junkHosts: parseList(getVal("filter_junk_hosts"), DEFAULT_FILTER_SETTINGS.junkHosts),
          junkHostPrefixes: parseList(getVal("filter_junk_host_prefixes"), DEFAULT_FILTER_SETTINGS.junkHostPrefixes),
          junkUsernameSubstrings: parseList(getVal("filter_junk_username_substrings"), DEFAULT_FILTER_SETTINGS.junkUsernameSubstrings),
          skipDomains: getVal("filter_skip_domains")
            ? getVal("filter_skip_domains").split(",").map((d: string) => d.trim()).filter(Boolean)
            : [],
          domainFilter: getVal("filter_domain_filter") || "",
        })
      }
    } catch (error) {
      console.error("Error loading filter settings:", error)
      toast({
        title: "Error",
        description: "Failed to load filter settings. Using defaults.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            { key_name: "filter_junk_prefixes", value: formData.junkPrefixes },
            { key_name: "filter_junk_hosts", value: formData.junkHosts },
            { key_name: "filter_junk_host_prefixes", value: formData.junkHostPrefixes },
            { key_name: "filter_junk_username_substrings", value: formData.junkUsernameSubstrings },
            { key_name: "filter_skip_domains", value: formData.skipDomains.join(",") },
            { key_name: "filter_domain_filter", value: formData.domainFilter },
          ],
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message || "Filter settings saved successfully",
        })
        await loadSettings()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving filter settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save filter settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    setFormData({
      junkPrefixes: DEFAULT_FILTER_SETTINGS.junkPrefixes.join(", "),
      junkHosts: DEFAULT_FILTER_SETTINGS.junkHosts.join(", "),
      junkHostPrefixes: DEFAULT_FILTER_SETTINGS.junkHostPrefixes.join(", "),
      junkUsernameSubstrings: DEFAULT_FILTER_SETTINGS.junkUsernameSubstrings.join(", "),
      skipDomains: [],
      domainFilter: "",
    })
  }

  const handleAddSkipDomain = () => {
    const domain = newSkipDomain.trim().toLowerCase()
    if (!domain) return
    if (formData.skipDomains.includes(domain)) {
      toast({ title: "Already exists", description: `${domain} is already in the skip list`, variant: "destructive" })
      return
    }
    setFormData({ ...formData, skipDomains: [...formData.skipDomains, domain] })
    setNewSkipDomain("")
  }

  const handleRemoveSkipDomain = (domain: string) => {
    setFormData({ ...formData, skipDomains: formData.skipDomains.filter((d) => d !== domain) })
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading filter settings...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-foreground">Domain &amp; URL Exclusion Filters</CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure which credentials to skip during upload processing based on URL patterns, hostnames, and domains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border-2 border-blue-500/50 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium leading-relaxed">
              These filters are applied <strong>before</strong> credentials are inserted into the database.
              Junk entries (like <code>android://</code> URLs, localhost, private IPs, Telegram usernames)
              are automatically skipped. You can also add specific domains to skip or restrict imports to a
              specific TLD (e.g. <code>.lk</code>).
            </p>
          </div>
        </div>

        {/* Junk URL Prefixes */}
        <div className="space-y-2">
          <Label htmlFor="junkPrefixes" className="text-foreground">
            Junk URL Prefixes
          </Label>
          <Textarea
            id="junkPrefixes"
            value={formData.junkPrefixes}
            onChange={(e) => setFormData({ ...formData, junkPrefixes: e.target.value })}
            placeholder="android://"
            className="glass-card border-border/50 text-foreground min-h-[60px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated URL prefixes to always skip. Credentials whose URL starts with any of these are discarded.
          </p>
        </div>

        {/* Junk Hosts */}
        <div className="space-y-2">
          <Label htmlFor="junkHosts" className="text-foreground">
            Junk Hosts
          </Label>
          <Textarea
            id="junkHosts"
            value={formData.junkHosts}
            onChange={(e) => setFormData({ ...formData, junkHosts: e.target.value })}
            placeholder="localhost, 127.0.0.1, android"
            className="glass-card border-border/50 text-foreground min-h-[60px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated exact hostnames to skip (e.g. <code>localhost</code>, <code>127.0.0.1</code>).
          </p>
        </div>

        {/* Junk Host Prefixes */}
        <div className="space-y-2">
          <Label htmlFor="junkHostPrefixes" className="text-foreground">
            Junk Host Prefixes
          </Label>
          <Textarea
            id="junkHostPrefixes"
            value={formData.junkHostPrefixes}
            onChange={(e) => setFormData({ ...formData, junkHostPrefixes: e.target.value })}
            placeholder="192.168., 10., 172.16."
            className="glass-card border-border/50 text-foreground min-h-[80px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated hostname prefixes to skip. Useful for blocking private IP ranges.
          </p>
        </div>

        {/* Junk Username Substrings */}
        <div className="space-y-2">
          <Label htmlFor="junkUsernameSubstrings" className="text-foreground">
            Junk Username Substrings
          </Label>
          <Textarea
            id="junkUsernameSubstrings"
            value={formData.junkUsernameSubstrings}
            onChange={(e) => setFormData({ ...formData, junkUsernameSubstrings: e.target.value })}
            placeholder="t.me, telegram.me, telegram"
            className="glass-card border-border/50 text-foreground min-h-[60px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated substrings. If a username contains any of these, the credential is skipped.
          </p>
        </div>

        {/* Skip Domains */}
        <div className="space-y-2">
          <Label className="text-foreground">Skip Domains</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newSkipDomain}
              onChange={(e) => setNewSkipDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddSkipDomain()
                }
              }}
              placeholder="e.g. google.com"
              className="glass-card border-border/50 text-foreground"
            />
            <Button
              onClick={handleAddSkipDomain}
              variant="outline"
              className="glass-card border-border/50 text-foreground hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.skipDomains.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.skipDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5"
                >
                  <span className="text-sm text-foreground font-mono">{domain}</span>
                  <button
                    onClick={() => handleRemoveSkipDomain(domain)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pt-1">No domains in skip list. Add domains above to exclude them.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Domains in this list (and their subdomains) will be skipped during credential insertion.
          </p>
        </div>

        {/* Domain TLD Filter */}
        <div className="space-y-2">
          <Label htmlFor="domainFilter" className="text-foreground">
            Domain TLD Filter (optional)
          </Label>
          <Input
            id="domainFilter"
            type="text"
            value={formData.domainFilter}
            onChange={(e) => setFormData({ ...formData, domainFilter: e.target.value })}
            placeholder="e.g. .lk (leave empty to allow all)"
            className="glass-card border-border/50 text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            When set, only credentials whose domain ends with this suffix will be imported.
            Leave empty to allow all domains.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            onClick={handleResetDefaults}
            disabled={saving}
            variant="outline"
            className="glass-card border-border/50 text-foreground hover:bg-white/5"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
