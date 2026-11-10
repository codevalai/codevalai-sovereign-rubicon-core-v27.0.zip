{{/*
Expand the name of the chart.
*/}}
{{- define "sovereign-rubicon-core.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | suffix "" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "sovereign-rubicon-core.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | suffix "" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | suffix "" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | suffix "" -}}
{{- end -}}
{{- end -}}
{{- end -}}
