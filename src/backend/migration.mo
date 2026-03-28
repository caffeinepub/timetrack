import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";

module {
  public type DayType = {
    #work;
    #conge;
    #astreinte;
  };

  type TimeEntry = {
    id : Text;
    date : Time.Time;
    startMorning : Int;
    endMorning : Int;
    startAfternoon : Int;
    endAfternoon : Int;
    heuresRepas : Int;
    heuresTrajet : Int;
    startAstreinte : ?Int;
    endAstreinte : ?Int;
    typeOfDay : DayType;
    user : Principal.Principal;
    description : Text;
    interventionSlots : [InterventionSlot];
  };

  public type InterventionSlot = {
    startHour : Int;
    startMinute : Int;
    endHour : Int;
    endMinute : Int;
  };

  public type MediaType = {
    #photo : Storage.ExternalBlob;
    #audio : Storage.ExternalBlob;
  };

  public type PlanningItem = {
    id : Text;
    titre : Text;
    dates : [Time.Time];
    createur : Principal.Principal;
    nomCreateur : Text;
    destinataire : Principal.Principal;
    nomDestinataire : Text;
    clientNom : Text;
    typeMission : Text;
    description : Text;
    statut : Text;
    createdAt : Time.Time;
  };

  module PlanningItem {
    public func compareByFirstDate(a : PlanningItem, b : PlanningItem) : Order.Order {
      if (a.dates.size() == 0 and b.dates.size() == 0) { return #equal };
      if (a.dates.size() == 0) { return #greater };
      if (b.dates.size() == 0) { return #less };
      Int.compare(a.dates[0], b.dates[0]);
    };
  };

  public type Actor = {
    planningItems : Map.Map<Text, PlanningItem>;
  };

  public func run(old : { }) : Actor {
    { planningItems = Map.empty<Text, PlanningItem>() };
  };
};
