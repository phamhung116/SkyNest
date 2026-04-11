import { Link } from "react-router-dom";
import type { ServicePackage } from "@paragliding/api-client";
import { Badge, Button, Card, Panel } from "@paragliding/ui";
import { formatCurrency } from "@/shared/lib/format";

type ServiceCardProps = {
  item: ServicePackage;
};

export const ServiceCard = ({ item }: ServiceCardProps) => (
  <Card className="package-card">
    <div className="package-card__media">
      <img className="package-card__image" src={item.hero_image} alt={item.name} />
      <div className="package-card__media-glow" />
    </div>

    <Panel className="package-card__body">
      <div className="package-card__badge-row package-card__badge-row--body">
        <Badge className="package-card__badge">{item.featured ? "Khuyen nghi" : "Pho bien"}</Badge>
        <Badge className="package-card__badge package-card__badge--location">{item.launch_site_name}</Badge>
      </div>

      <div className="package-card__meta">
        <span>{item.flight_duration_minutes} phut bay</span>
        <span>Tre em {item.min_child_age}+</span>
      </div>

      <h3>{item.name}</h3>
      <p>{item.short_description}</p>

      <div className="package-card__feature-list">
        {item.included_services.slice(0, 3).map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>

      <div className="package-card__footer">
        <div className="package-card__price">
          <small>Gia tu</small>
          <strong>{formatCurrency(item.price)}</strong>
        </div>
        <div className="package-card__actions">
          <Link to={`/booking?service=${item.slug}`}>
            <Button>Dat lich</Button>
          </Link>
          <Link to={`/services/${item.slug}`}>
            <Button variant="secondary">Chi tiet</Button>
          </Link>
        </div>
      </div>
    </Panel>
  </Card>
);
