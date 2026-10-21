/**
 * LineChart — lightweight, responsive SVG line chart using react-native-svg.
 * Features:
 *   - Smooth gradient area fill
 *   - Grid lines and Y-axis min/max markers
 *   - X-axis date labels
 *   - Touch or latest value dot indicator
 *   - Safe handling for 0, 1, or N points
 */

import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';

export interface DataPoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: DataPoint[];
  height?: number;
  unit?: string;
  color?: string;
  emptyMessage?: string;
}

export function LineChart({
  data,
  height = 180,
  unit = '',
  color,
  emptyMessage = 'Not enough data points yet',
}: LineChartProps) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(300);

  const strokeColor = color ?? theme.accent;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;

  const chartWidth = Math.max(10, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(10, height - paddingTop - paddingBottom);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  };

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height, backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text variant="caption" color="textMuted">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  // Min and max
  const values = data.map((d) => d.value);
  const minValRaw = Math.min(...values);
  const maxValRaw = Math.max(...values);
  const range = maxValRaw - minValRaw;

  // Add buffer
  const minVal = range === 0 ? Math.max(0, minValRaw - 5) : Math.max(0, minValRaw - range * 0.1);
  const maxVal = range === 0 ? maxValRaw + 5 : maxValRaw + range * 0.1;
  const effectiveRange = maxVal - minVal || 1;

  // Compute points
  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / effectiveRange) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  // Construct SVG Path
  let linePath = '';
  let areaPath = '';

  if (points.length === 1) {
    const p = points[0];
    linePath = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`;
    areaPath = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${paddingTop + chartHeight} L ${p.x - 20} ${paddingTop + chartHeight} Z`;
  } else {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cx = (prev.x + cur.x) / 2;
      linePath += ` C ${cx} ${prev.y}, ${cx} ${cur.y}, ${cur.x} ${cur.y}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    areaPath = `${linePath} L ${last.x} ${paddingTop + chartHeight} L ${first.x} ${paddingTop + chartHeight} Z`;
  }

  const latestPoint = points[points.length - 1];

  // X-axis label selection (show first, middle, last)
  const xLabels =
    points.length <= 4
      ? points
      : [
          points[0],
          points[Math.floor(points.length / 2)],
          points[points.length - 1],
        ];

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={width - paddingRight}
          y2={paddingTop}
          stroke={theme.border}
          strokeDasharray="4, 4"
          strokeWidth="1"
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight / 2}
          stroke={theme.border}
          strokeDasharray="4, 4"
          strokeWidth="1"
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke={theme.border}
          strokeWidth="1"
        />

        {/* Y-axis Labels */}
        <SvgText
          x={paddingLeft - 6}
          y={paddingTop + 4}
          fill={theme.textMuted}
          fontSize="10"
          textAnchor="end"
          fontFamily="System"
        >
          {Math.round(maxValRaw)}
        </SvgText>
        <SvgText
          x={paddingLeft - 6}
          y={paddingTop + chartHeight / 2 + 4}
          fill={theme.textMuted}
          fontSize="10"
          textAnchor="end"
          fontFamily="System"
        >
          {Math.round((maxValRaw + minValRaw) / 2)}
        </SvgText>
        <SvgText
          x={paddingLeft - 6}
          y={paddingTop + chartHeight + 4}
          fill={theme.textMuted}
          fontSize="10"
          textAnchor="end"
          fontFamily="System"
        >
          {Math.round(minValRaw)}
        </SvgText>

        {/* Area fill */}
        <Path d={areaPath} fill="url(#chartGradient)" />

        {/* Main Line */}
        <Path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Highlight latest point */}
        <Circle cx={latestPoint.x} cy={latestPoint.y} r="5" fill={strokeColor} />
        <Circle cx={latestPoint.x} cy={latestPoint.y} r="2.5" fill={theme.surface} />

        {/* X-axis date labels */}
        {xLabels.map((pt, idx) => (
          <SvgText
            key={idx}
            x={pt.x}
            y={height - 6}
            fill={theme.textMuted}
            fontSize="10"
            textAnchor="middle"
            fontFamily="System"
          >
            {pt.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
});
