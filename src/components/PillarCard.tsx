import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";
interface PillarProps {
  pillar: {
    id: string;
    title: string;
    icon: LucideIcon;
    description: string;
    color: string;
    features: string[];
    stats: { metric: string; value: string; trend: string };
  };
}
export const PillarCard = ({ pillar }: PillarProps) => {
  const navigate = useNavigate();
  const { icon: Icon } = pillar;
  const isPositiveTrend = pillar.stats.trend.startsWith("+");
  const handleOptimizeClick = () => {
    navigate(`/${pillar.id}`);
  };
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${pillar.color} text-white`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{pillar.stats.value}</div>
            <div
              className={`flex items-center text-sm ${isPositiveTrend ? "text-green-600" : "text-red-600"}`}
            >
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {pillar.stats.trend}
            </div>
          </div>
        </div>
        <CardTitle className="text-xl">{pillar.title}</CardTitle>
        <CardDescription className="text-sm">
          {pillar.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground font-medium">
          {pillar.stats.metric}
        </div>
        <div className="space-y-2">
          {pillar.features.map((feature, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs mr-2 mb-1"
            >
              {feature}
            </Badge>
          ))}
        </div>
        <Button className="w-full mt-4 group" onClick={handleOptimizeClick}>
          Optimize {pillar.title}
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};
